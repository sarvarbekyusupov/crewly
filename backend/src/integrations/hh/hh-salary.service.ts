import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { HH_BASE_URL, HH_HOST, HH_UZBEKISTAN_AREA_ID } from './hh.constants';
import type { HhSalaryEstimate } from './hh.types';

export type { HhSalaryEstimate };

@Injectable()
export class HhSalaryService {
  private readonly logger = new Logger(HhSalaryService.name);
  private readonly baseUrl = HH_BASE_URL;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private get headers() {
    const token = this.config.get<string>('HH_EMPLOYER_TOKEN');
    const ua =
      this.config.get<string>('HH_USER_AGENT') ??
      'Crewly/1.0 (contact@crewly.uz)';
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
      'User-Agent': ua,
      'HH-User-Agent': ua,
    };
  }

  /**
   * GET /salary_statistics/paid/salary_evaluation/{area_id}
   * Requires a paid Salary Database subscription on the employer account.
   * Returns gross/net percentile25, median, percentile75 for the given position.
   */
  async getSalaryEstimate(params: {
    positionName: string;
    areaId?: string;
    industry?: string;
    employeeLevel?: string;
    speciality?: string;
    extendSources?: boolean;
  }): Promise<HhSalaryEstimate> {
    const areaId = params.areaId ?? HH_UZBEKISTAN_AREA_ID;
    const resp = await firstValueFrom(
      this.http.get<HhSalaryEstimate>(
        `${this.baseUrl}/salary_statistics/paid/salary_evaluation/${areaId}`,
        {
          headers: this.headers,
          params: {
            host: HH_HOST,
            position_name: params.positionName,
            extend_sources: params.extendSources ?? true,
            ...(params.industry && { industry: params.industry }),
            ...(params.employeeLevel && {
              employee_level: params.employeeLevel,
            }),
            ...(params.speciality && { speciality: params.speciality }),
          },
        },
      ),
    );
    this.logger.debug(
      { positionName: params.positionName, areaId },
      'HH salary estimate fetched',
    );
    return resp.data;
  }
}
