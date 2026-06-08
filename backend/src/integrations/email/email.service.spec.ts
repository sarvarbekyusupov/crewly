import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let configGet: jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn((key: string) => {
      if (key === 'RESEND_API_KEY') return 'test-key';
      if (key === 'FROM_EMAIL') return 'no-reply@crewly.uz';
      return undefined;
    });

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'email-id-1' }),
      text: jest.fn().mockResolvedValue(''),
    });
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get(EmailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('send', () => {
    it('returns null when no API key configured', async () => {
      configGet.mockImplementation((key: string) =>
        key === 'RESEND_API_KEY' ? '' : 'no-reply@crewly.uz',
      );
      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      const svc = module.get(EmailService);

      const result = await svc.send({
        to: 'a@b.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      });
      expect(result).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('calls Resend API and returns email id', async () => {
      const result = await service.send({
        to: 'a@b.com',
        subject: 'Hi',
        html: '<p>Hello</p>',
      });
      expect(result).toBe('email-id-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on non-ok API response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        text: jest.fn().mockResolvedValue('Unprocessable Entity'),
      });
      await expect(
        service.send({ to: 'a@b.com', subject: 'Hi', html: '' }),
      ).rejects.toThrow('Resend API error 422');
    });

    it('sends to array of recipients', async () => {
      await service.send({
        to: ['a@b.com', 'c@d.com'],
        subject: 'Hi',
        html: '',
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toEqual(['a@b.com', 'c@d.com']);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      jest.spyOn(service, 'send').mockResolvedValue('msg-id');
    });

    it('sendCandidateDelivered calls send', async () => {
      await service.sendCandidateDelivered('mgr@co.com', 'Dev', 'Alice');
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'mgr@co.com' }),
      );
    });

    it('sendPasswordReset calls send', async () => {
      await service.sendPasswordReset('u@x.com', 'https://crewly.uz/reset');
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@x.com' }),
      );
    });

    it('sendEmailVerification calls send', async () => {
      await service.sendEmailVerification(
        'u@x.com',
        'https://crewly.uz/verify',
      );
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@x.com' }),
      );
    });

    it('sendInvite calls send', async () => {
      await service.sendInvite(
        'u@x.com',
        'Bob',
        'https://crewly.uz/setup',
        'Acme',
      );
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@x.com' }),
      );
    });

    it('sendGuaranteeExpired calls send', async () => {
      await service.sendGuaranteeExpired('u@x.com', 'Alice', 'Dev');
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@x.com' }),
      );
    });

    it('sendInvoice calls send', async () => {
      await service.sendInvoice(
        'u@x.com',
        'INV-001',
        BigInt(1000000),
        new Date('2026-06-01'),
      );
      expect(service.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'u@x.com' }),
      );
    });
  });
});
