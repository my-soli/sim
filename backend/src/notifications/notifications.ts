import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Email via SMTP when SMTP_HOST is set, otherwise logs to the console (dev).
 * Mobile push (FCM) is not wired up yet - only the user's pushToken column exists.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get('MAIL_FROM', 'eSIM Store <no-reply@localhost>');
    this.transport = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT', '587')),
          auth: config.get('SMTP_USER') ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') } : undefined,
        })
      : null;
  }

  async email(to: string | null | undefined, subject: string, text: string) {
    if (!to) return;
    if (!this.transport) {
      this.log.log(`[email → ${to}] ${subject}\n${text}`);
      return;
    }
    try {
      await this.transport.sendMail({ from: this.from, to, subject, text });
    } catch (e) {
      this.log.error(`Email to ${to} failed: ${(e as Error).message}`);
    }
  }

  async sendOtp(email: string | null, identifier: string, code: string) {
    if (email) return this.email(email, 'Your sign-in code', `Your code is ${code}. It expires in 10 minutes.`);
    this.log.log(`[sms → ${identifier}] code ${code} (no SMS gateway configured)`);
  }
}

@Global()
@Module({ providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
