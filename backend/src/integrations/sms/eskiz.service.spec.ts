import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EskizService } from './eskiz.service';

describe('EskizService', () => {
  let service: EskizService;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'ESKIZ_EMAIL') return 'test@eskiz.uz';
        if (key === 'ESKIZ_PASSWORD') return 'secret';
        if (key === 'ESKIZ_FROM') return 'myhr';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EskizService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<EskizService>(EskizService);
  });

  beforeEach(() => {
    globalThis.fetch = jest.fn() as any;
  });

  it('authenticates and gets token successfully', async () => {
    const mockAuthResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { token: 'mock-jwt-token' },
      }),
    };
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce(mockAuthResponse);

    const token = await (service as any).authenticate();
    expect(token).toBe('mock-jwt-token');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://notify.eskiz.uz/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@eskiz.uz', password: 'secret' }),
      }),
    );
  });

  it('sends SMS successfully', async () => {
    const mockAuthResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { token: 'mock-jwt-token' },
      }),
    };
    const mockSendResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'waiting',
      }),
    };

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce(mockAuthResponse)
      .mockResolvedValueOnce(mockSendResponse);

    const success = await service.sendSms('998901234567', 'Test message');
    expect(success).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      'https://notify.eskiz.uz/api/message/sms/send',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-jwt-token',
        },
        body: JSON.stringify({
          mobile_phone: '998901234567',
          message: 'Test message',
          from: 'myhr',
        }),
      }),
    );
  });

  it('fails gracefully and normalizes short phone number format', async () => {
    const mockAuthResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { token: 'mock-jwt-token' },
      }),
    };
    const mockSendResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: 'waiting',
      }),
    };

    (globalThis.fetch as jest.Mock)
      .mockResolvedValueOnce(mockAuthResponse)
      .mockResolvedValueOnce(mockSendResponse);

    const success = await service.sendSms('901234567', 'Test message');
    expect(success).toBe(true);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      'https://notify.eskiz.uz/api/message/sms/send',
      expect.objectContaining({
        body: JSON.stringify({
          mobile_phone: '998901234567',
          message: 'Test message',
          from: 'myhr',
        }),
      }),
    );
  });
});
