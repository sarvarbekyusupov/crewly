import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use authenticated user ID when available, fall back to IP.
    // This prevents users behind a shared corporate NAT from sharing a rate-limit bucket.
    return req.user?.id ?? req.ip ?? 'unknown';
  }
}
