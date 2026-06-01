import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly tavilyApiKey: string | null;

  constructor(private readonly config: ConfigService) {
    this.tavilyApiKey = config.get<string>('TAVILY_API_KEY') || null;
    if (!this.tavilyApiKey) {
      this.logger.warn(
        'TAVILY_API_KEY not set — deep web sourcing will be disabled',
      );
    }
  }

  async search(query: string, limit = 5): Promise<SearchResult[]> {
    if (!this.tavilyApiKey) {
      this.logger.debug(`Search skipped (no API key): ${query}`);
      return [];
    }

    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query,
        search_depth: 'basic',
        include_images: false,
        include_answer: false,
        max_results: limit,
      });

      return response.data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      }));
    } catch (err: any) {
      this.logger.error(`Tavily search failed: ${err.message}`);
      return [];
    }
  }
}
