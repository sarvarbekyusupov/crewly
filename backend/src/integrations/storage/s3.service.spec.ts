import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
    __mockSend: send,
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed-url'),
}));

describe('S3Service', () => {
  describe('when S3 not configured', () => {
    let service: S3Service;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
        ],
      }).compile();
      service = module.get(S3Service);
    });

    it('isConfigured returns false', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('upload returns empty string', async () => {
      const result = await service.upload(
        'key',
        Buffer.from('data'),
        'text/plain',
      );
      expect(result).toBe('');
    });

    it('getSignedUrl returns empty string', async () => {
      const result = await service.getSignedUrl('key');
      expect(result).toBe('');
    });

    it('delete is noop', async () => {
      await expect(service.delete('key')).resolves.toBeUndefined();
    });
  });

  describe('when S3 configured', () => {
    let service: S3Service;

    beforeEach(async () => {
      const configGet = jest.fn((key: string) => {
        const vals: Record<string, string> = {
          S3_ENDPOINT: 'https://s3.example.com',
          S3_ACCESS_KEY: 'access-key',
          S3_SECRET_KEY: 'secret-key',
          S3_BUCKET: 'my-bucket',
        };
        return vals[key] ?? '';
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          S3Service,
          { provide: ConfigService, useValue: { get: configGet } },
        ],
      }).compile();
      service = module.get(S3Service);
    });

    it('isConfigured returns true', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('upload returns public URL', async () => {
      const result = await service.upload(
        'folder/file.pdf',
        Buffer.from('pdf'),
        'application/pdf',
      );
      expect(result).toContain('my-bucket');
      expect(result).toContain('folder/file.pdf');
    });

    it('upload accepts string body', async () => {
      const result = await service.upload(
        'file.txt',
        'hello world',
        'text/plain',
      );
      expect(result).toContain('file.txt');
    });

    it('getSignedUrl returns signed URL', async () => {
      const result = await service.getSignedUrl('key.pdf', 600);
      expect(result).toBe('https://signed-url');
    });

    it('delete sends DeleteObjectCommand', async () => {
      await service.delete('key.pdf');
      const { __mockSend } = require('@aws-sdk/client-s3');
      expect(__mockSend).toHaveBeenCalled();
    });
  });
});
