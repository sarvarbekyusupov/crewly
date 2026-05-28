import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { z } from 'zod';

export const UpsertFeatureFlagSchema = z.object({
  name: z.string().min(1).max(100),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  companyOverrides: z.any().optional(),
});

export type UpsertFeatureFlagDto = z.infer<typeof UpsertFeatureFlagSchema>;

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly db: PrismaService) {}

  async findAll() {
    return this.db.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async upsert(dto: UpsertFeatureFlagDto) {
    return this.db.featureFlag.upsert({
      where: { name: dto.name },
      create: {
        name: dto.name,
        enabled: dto.enabled,
        rolloutPercentage: dto.rolloutPercentage,
        companyOverrides: dto.companyOverrides ?? {},
      },
      update: {
        enabled: dto.enabled,
        rolloutPercentage: dto.rolloutPercentage,
        companyOverrides: dto.companyOverrides ?? {},
      },
    });
  }

  async delete(name: string) {
    return this.db.featureFlag.delete({
      where: { name },
    });
  }
}
