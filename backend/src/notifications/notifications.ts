import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

/**
 * Email via Resend's HTTP API when RESEND_API_KEY is set (preferred - works on any host,
 * including Railway's Hobby plan, which blocks outbound SMTP ports 25/465/587 entirely).
 * Falls back to SMTP when SMTP_HOST is set, otherwise logs to the console (dev).
 * SMS via Africa's Talking when AT_USERNAME/AT_API_KEY are set, otherwise logs to the console (dev).
 * Mobile push (FCM) is not wired up yet - only the user's pushToken column exists.
 */
@Injectable()
export class NotificationsService {
  private readonly log = new Logger(NotificationsService.name);
  private readonly transport: Transporter | null;
  private readonly from: string;
  private readonly resendApiKey: string | undefined;
  private readonly atUsername: string | undefined;
  private readonly atApiKey: string | undefined;
  private readonly atSenderId: string | undefined;
  private readonly atBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get('MAIL_FROM', 'eSIM Store <no-reply@localhost>');
    this.transport = host
      ? createTransport({
          host,
          port: Number(config.get('SMTP_PORT', '587')),
          auth: config.get('SMTP_USER') ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') } : undefined,
        })
      : null;
    this.resendApiKey = config.get<string>('RESEND_API_KEY');

    this.atUsername = config.get<string>('AT_USERNAME');
    this.atApiKey = config.get<string>('AT_API_KEY');
    this.atSenderId = config.get<string>('AT_SENDER_ID');
    // Africa's Talking uses a separate sandbox host for the "sandbox" test username.
    this.atBaseUrl =
      this.atUsername === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  }

  async email(to: string | null | undefined, subject: string, text: string) {
    if (!to) return;
    if (this.resendApiKey) return this.emailViaResend(to, subject, text);
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

  private async emailViaResend(to: string, subject: string, text: string) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: this.from, to, subject, text }),
      });
      if (!res.ok) this.log.error(`Email to ${to} failed: ${await res.text()}`);
    } catch (e) {
      this.log.error(`Email to ${to} failed: ${(e as Error).message}`);
    }
  }

  async sms(to: string, message: string) {
    if (!this.atUsername || !this.atApiKey) {
      this.log.log(`[sms → ${to}] ${message} (no SMS gateway configured)`);
      return;
    }
    try {
      const res = await fetch(`${this.atBaseUrl}/version1/messaging`, {
        method: 'POST',
        headers: {
          apiKey: this.atApiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.atUsername,
          to,
          message,
          ...(this.atSenderId ? { from: this.atSenderId } : {}),
        }),
      });
      const json = (await res.json()) as {
        SMSMessageData?: { Recipients?: Array<{ status: string; statusCode: number }> };
      };
      const recipient = json.SMSMessageData?.Recipients?.[0];
      if (!res.ok || !recipient || recipient.statusCode < 100 || recipient.statusCode >= 200) {
        this.log.error(`SMS to ${to} failed: ${JSON.stringify(json)}`);
      }
    } catch (e) {
      this.log.error(`SMS to ${to} failed: ${(e as Error).message}`);
    }
  }

  async sendOtp(email: string | null, identifier: string, code: string) {
    if (email) return this.email(email, 'Your sign-in code', `Your code is ${code}. It expires in 10 minutes.`);
    return this.sms(identifier, `Your ${this.config.get('BRAND_NAME', 'eSIM')} sign-in code is ${code}. It expires in 10 minutes.`);
  }
}

@Global()
@Module({ providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
