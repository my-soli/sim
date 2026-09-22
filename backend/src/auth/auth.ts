import {
  BadRequestException,
  CanActivate,
  Body,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Global,
  HttpCode,
  Injectable,
  Logger,
  Module,
  Post,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { IsString, MinLength } from 'class-validator';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.js';

export interface AuthUser {
  sub: string;
  isAdmin: boolean;
}

const OTP_TTL_MS = 10 * 60_000;
const OTP_RESEND_MS = 30_000;
const OTP_MAX_ATTEMPTS = 5;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export class RequestOtpDto {
  /** Email address or phone number (E.164, e.g. +254712345678). */
  @IsString() @MinLength(5) identifier: string;
}
export class VerifyOtpDto {
  @IsString() @MinLength(5) identifier: string;
  @IsString() @MinLength(4) code: string;
}

function normalise(raw: string): { email?: string; phone?: string; key: string } {
  const v = raw.trim();
  if (v.includes('@')) {
    const email = v.toLowerCase();
    return { email, key: email };
  }
  const phone = '+' + v.replace(/[^\d]/g, '');
  if (phone.length < 9) throw new BadRequestException('Enter a valid email or phone number');
  return { phone, key: phone };
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notify: NotificationsService,
  ) {}

  async requestOtp(identifier: string) {
    const { key, email } = normalise(identifier);
    const last = await this.prisma.otpCode.findFirst({ where: { identifier: key }, orderBy: { createdAt: 'desc' } });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_MS) {
      throw new BadRequestException('Please wait a few seconds before requesting another code');
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.otpCode.create({
      data: { identifier: key, codeHash: hash(`${key}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    // Email goes out via SMTP when configured. There is no SMS gateway wired up yet:
    // phone OTPs are only logged (and echoed in dev), so real phone login needs an SMS provider.
    await this.notify.sendOtp(email ?? null, key, code);
    const echo = this.config.get('OTP_DEV_ECHO', 'false') === 'true';
    return { sent: true, ...(echo ? { devCode: code } : {}) };
  }

  async verifyOtp(identifier: string, code: string) {
    const { key, email, phone } = normalise(identifier);
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier: key, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) throw new UnauthorizedException('Code expired. Request a new one.');
    if (otp.codeHash !== hash(`${key}:${code.trim()}`)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException('Incorrect code');
    }
    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    const admins = this.config.get<string>('ADMIN_EMAILS', '').toLowerCase().split(',').map((s) => s.trim());
    const user = email
      ? await this.prisma.user.upsert({ where: { email }, update: {}, create: { email } })
      : await this.prisma.user.upsert({ where: { phone: phone! }, update: {}, create: { phone } });
    const isAdmin = user.isAdmin || (!!user.email && admins.includes(user.email));
    const token = await this.jwt.signAsync({ sub: user.id, isAdmin } satisfies AuthUser);
    return { token, user: { id: user.id, email: user.email, phone: user.phone, isAdmin } };
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const h: string | undefined = req.headers['authorization'];
    if (!h?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      req.user = await this.jwt.verifyAsync<AuthUser>(h.slice(7));
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  override async canActivate(ctx: ExecutionContext) {
    await super.canActivate(ctx);
    if (!ctx.switchToHttp().getRequest().user?.isAdmin) throw new ForbiddenException();
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request') @HttpCode(200)
  request(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.identifier);
  }

  @Post('otp/verify') @HttpCode(200)
  verify(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.identifier, dto.code);
  }
}

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.getOrThrow<string>('JWT_SECRET'), signOptions: { expiresIn: '30d' } }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard],
  exports: [JwtModule, JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
