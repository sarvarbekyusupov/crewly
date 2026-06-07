import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EskizService {
  private readonly logger = new Logger(EskizService.name);
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly config: ConfigService) {}

  private async authenticate(): Promise<string | null> {
    const email = this.config.get<string>('ESKIZ_EMAIL');
    const password = this.config.get<string>('ESKIZ_PASSWORD');

    if (!email || !password) {
      return null;
    }

    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      const response = await fetch('https://notify.eskiz.uz/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(`Auth failed with status ${response.status}`);
      }

      const resData = await response.json();
      const token = resData?.data?.token;
      if (token) {
        this.token = token;
        // Token expires in 25 days (standard is 30 days)
        this.tokenExpiresAt = Date.now() + 25 * 24 * 60 * 60 * 1000;
        return this.token;
      }
    } catch (err: any) {
      this.logger.error({ err: err.message }, 'Eskiz authentication failed');
    }

    return null;
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    const token = await this.authenticate();
    if (!token) {
      this.logger.warn(
        'Skipping SMS send because Eskiz credentials are unconfigured or authentication failed.',
      );
      return false;
    }

    const normalized = phoneNumber.replace(/\D/g, '');
    let formatted = normalized;
    if (normalized.length === 9) {
      formatted = '998' + normalized;
    }

    if (formatted.length !== 12 || !formatted.startsWith('998')) {
      this.logger.warn(
        { phoneNumber, formatted },
        'Invalid phone number format for Eskiz. Must be 12 digits starting with 998.',
      );
      return false;
    }

    const from = this.config.get<string>('ESKIZ_FROM') || '4546';

    try {
      const response = await fetch(
        'https://notify.eskiz.uz/api/message/sms/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mobile_phone: formatted,
            message,
            from,
          }),
        },
      );

      const resData = await response.json();
      if (
        response.ok &&
        (resData?.status === 'waiting' || resData?.status === 'sent')
      ) {
        this.logger.log(
          { phoneNumber: formatted },
          'SMS sent successfully via Eskiz',
        );
        return true;
      }
      this.logger.warn({ resData }, 'Eskiz returned warning response status');
    } catch (err: any) {
      this.logger.error(
        { phoneNumber: formatted, err: err.message },
        'Failed to send SMS via Eskiz',
      );
    }

    return false;
  }
}
