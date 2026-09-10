import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: Number(this.configService.get('SMTP_PORT') ?? 587),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth:
        this.configService.get('SMTP_USER') && this.configService.get('SMTP_PASS')
          ? {
              user: this.configService.get<string>('SMTP_USER'),
              pass: this.configService.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
    return this.transporter;
  }

  private from(): string {
    return this.configService.get<string>('MAIL_FROM') ?? 'SynapGrid <no-reply@synapgrid.net>';
  }

  private get mailEnabled(): boolean {
    return this.configService.get('MAIL_ENABLED') === 'true';
  }

  async send(to: string, subject: string, text: string, html?: string): Promise<void> {
    if (!this.mailEnabled) {
      this.logger.log(`[MAIL:disabled] to=${to} subject="${subject}"`);
      return;
    }
    try {
      await this.getTransporter().sendMail({ from: this.from(), to, subject, text, html });
      this.logger.log(`Mail sent to=${to} subject="${subject}"`);
    } catch (err) {
      this.logger.error(`Mail send failed to=${to}: ${(err as Error).message}`);
      throw err;
    }
  }

  async sendNewsletterConfirmation(to: string, token: string): Promise<void> {
    const baseUrl = this.configService.get('APP_PUBLIC_URL') ?? 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/v1/newsletter/confirm?token=${encodeURIComponent(token)}`;
    await this.send(
      to,
      'Confirm your SynapGrid newsletter subscription',
      `Welcome to SynapGrid!\n\nConfirm your subscription: ${confirmUrl}\n\nIf you didn't request this, ignore this email.`,
      `<p>Welcome to <strong>SynapGrid</strong>!</p><p><a href="${confirmUrl}">Confirm your subscription</a></p>`,
    );
  }

  async sendTicketCreated(to: string, reference: string, trackingToken: string): Promise<void> {
    const baseUrl = this.configService.get('APP_PUBLIC_URL') ?? 'http://localhost:3000';
    await this.send(
      to,
      `[${reference}] We received your support request`,
      `Thanks for contacting SynapGrid support.\n\nYour reference: ${reference}\nTrack/reply: ${baseUrl}/support/tickets/${trackingToken}\n\nKeep this token to follow up on your ticket.`,
    );
  }

  healthCheck(): boolean {
    return true;
  }
}
