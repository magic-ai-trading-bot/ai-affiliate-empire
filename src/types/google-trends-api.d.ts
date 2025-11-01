declare module 'google-trends-api' {
  export interface TrendOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    timezone?: number;
    category?: number;
    property?: string;
  }

  export function interestOverTime(options: TrendOptions): Promise<string>;
  export function interestByRegion(options: TrendOptions): Promise<string>;
  export function relatedQueries(options: TrendOptions): Promise<string>;
  export function relatedTopics(options: TrendOptions): Promise<string>;

  const googleTrends: {
    interestOverTime: typeof interestOverTime;
    interestByRegion: typeof interestByRegion;
    relatedQueries: typeof relatedQueries;
    relatedTopics: typeof relatedTopics;
  };

  export default googleTrends;
}
