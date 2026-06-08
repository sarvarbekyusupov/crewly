import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT') ?? '';
    const accessKeyId = config.get<string>('S3_ACCESS_KEY') ?? '';
    const secretAccessKey = config.get<string>('S3_SECRET_KEY') ?? '';
    this.bucket = config.get<string>('S3_BUCKET') ?? '';
    this.endpoint = endpoint;

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn('S3 not configured — storage calls will be no-ops');
      this.client = null;
      return;
    }

    this.client = new S3Client({
      endpoint,
      region: 'auto',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }

  private validateKey(key: string): void {
    if (key.includes('..') || key.startsWith('/') || /[<>{}|\\^`]/.test(key)) {
      throw new Error(`Invalid S3 key: "${key}"`);
    }
  }

  async upload(
    key: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<string> {
    this.validateKey(key);

    if (!this.client) {
      this.logger.warn({ key }, 'S3 upload skipped — not configured');
      return '';
    }

    const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buf,
          ContentType: contentType,
        }),
      );
    } catch (err: any) {
      throw new Error(`S3 upload failed for key "${key}": ${err.message}`);
    }

    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  async getSignedUrl(key: string, expiresInSecs = 3600): Promise<string> {
    this.validateKey(key);
    if (!this.client) return '';

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSecs });
  }

  async delete(key: string): Promise<void> {
    this.validateKey(key);
    if (!this.client) return;

    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}
