import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('RESEND_API_KEY') ?? '';
    const fromEmail = config.get<string>('FROM_EMAIL') ?? 'noreply@myhr.uz';
    this.from = `MyHR <${fromEmail}>`;
  }

  async send(opts: SendEmailOptions): Promise<string | null> {
    if (!this.apiKey) {
      this.logger.warn(
        { to: opts.to, subject: opts.subject },
        'Email skipped — RESEND_API_KEY not set',
      );
      return null;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.from ?? this.from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { id: string };
    return data.id ?? null;
  }

  async sendCandidateDelivered(
    hiringManagerEmail: string,
    jobTitle: string,
    candidateName: string,
  ) {
    await this.send({
      to: hiringManagerEmail,
      subject: `Новый кандидат готов к рассмотрению — ${jobTitle}`,
      html: `
        <p>Здравствуйте!</p>
        <p>Кандидат <strong>${candidateName}</strong> прошёл первичный скрининг на позицию <strong>${jobTitle}</strong>.</p>
        <p>Войдите в систему, чтобы просмотреть досье и принять решение.</p>
      `,
    });
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    await this.send({
      to: email,
      subject: 'Сброс пароля — MyHR',
      html: `
        <p>Вы запросили сброс пароля для вашего аккаунта MyHR.</p>
        <p><a href="${resetUrl}" style="color:#2563eb;">Нажмите здесь для сброса пароля</a></p>
        <p>Ссылка действительна <strong>1 час</strong>. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
      `,
    });
  }

  async sendEmailVerification(email: string, verifyUrl: string) {
    await this.send({
      to: email,
      subject: 'Подтвердите email — MyHR',
      html: `
        <p>Добро пожаловать в MyHR!</p>
        <p>Пожалуйста, подтвердите ваш email:</p>
        <p><a href="${verifyUrl}" style="color:#2563eb;">Подтвердить email</a></p>
        <p>Ссылка действительна <strong>24 часа</strong>.</p>
      `,
    });
  }

  async sendInvite(
    email: string,
    fullName: string,
    setupUrl: string,
    companyName: string,
  ) {
    await this.send({
      to: email,
      subject: `Вас пригласили в ${companyName} — MyHR`,
      html: `
        <p>Здравствуйте, ${fullName}!</p>
        <p>Вас пригласили в команду <strong>${companyName}</strong> на платформе MyHR.</p>
        <p><a href="${setupUrl}" style="color:#2563eb;">Нажмите здесь, чтобы задать пароль и войти</a></p>
        <p>Ссылка действительна <strong>72 часа</strong>.</p>
      `,
    });
  }

  async sendGuaranteeExpired(
    email: string,
    candidateName: string,
    jobTitle: string,
  ) {
    await this.send({
      to: email,
      subject: `Гарантийный период истёк — ${candidateName}`,
      html: `
        <p>Здравствуйте!</p>
        <p>Гарантийный период для кандидата <strong>${candidateName}</strong> на позиции <strong>${jobTitle}</strong> истёк.</p>
        <p>Войдите в систему для просмотра деталей размещения.</p>
      `,
    });
  }

  async sendInvoice(
    email: string,
    invoiceNumber: string,
    amountUzs: bigint,
    dueDate: Date,
  ) {
    const amount = Number(amountUzs).toLocaleString('ru-UZ');
    const due = dueDate.toLocaleDateString('ru-RU');
    await this.send({
      to: email,
      subject: `Счёт ${invoiceNumber} — оплата до ${due}`,
      html: `
        <p>Здравствуйте!</p>
        <p>Выставлен счёт <strong>${invoiceNumber}</strong> на сумму <strong>${amount} UZS</strong>.</p>
        <p>Срок оплаты: <strong>${due}</strong>.</p>
        <p>Реквизиты для оплаты уточните у вашего менеджера.</p>
      `,
    });
  }
}
