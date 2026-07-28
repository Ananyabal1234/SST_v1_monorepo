import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;
  readonly loginUrl: string;

  constructor(private readonly config: ConfigService) {
    const host = (this.config.get<string>('SMTP_HOST') || '').trim();
    this.from = (this.config.get<string>('SMTP_FROM') || '').trim()
      || this.config.get<string>('SMTP_USER')
      || 'noreply@localhost';
    this.loginUrl = (this.config.get<string>('APP_LOGIN_URL') || '').trim()
      || 'http://localhost:5173';
    this.enabled = Boolean(host);

    if (!this.enabled) {
      this.logger.warn('SMTP_HOST not set — outbound email disabled');
      return;
    }

    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const secureRaw = (this.config.get<string>('SMTP_SECURE') || 'false').toLowerCase();
    const secure = secureRaw === 'true' || secureRaw === '1';
    const user = this.config.get<string>('SMTP_USER') || undefined;
    // Gmail app passwords are often pasted with spaces — strip them.
    const passRaw = this.config.get<string>('SMTP_PASS') || '';
    const pass = passRaw.replace(/\s+/g, '') || undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP enabled → ${host}:${port} as ${user || 'anonymous'}`);
  }

  /** Fire-and-forget friendly: never throws into domain flows. */
  async send(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    scenario?: string;
  }): Promise<void> {
    const to = (opts.to || '').trim();
    if (!to) {
      this.logger.warn(`Skip email (${opts.scenario || 'unknown'}): empty recipient`);
      return;
    }
    if (!this.enabled || !this.transporter) {
      this.logger.debug(
        `Skip email (${opts.scenario || 'unknown'}) to ${to}: SMTP not configured`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.logger.log(`Email sent (${opts.scenario || 'unknown'}) → ${to}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Email failed (${opts.scenario || 'unknown'}) → ${to}: ${message}`,
      );
    }
  }
}
