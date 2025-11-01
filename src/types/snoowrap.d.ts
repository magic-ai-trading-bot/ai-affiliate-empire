declare module 'snoowrap' {
  export interface SnoowrapOptions {
    userAgent: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    accessToken?: string;
    refreshToken?: string;
  }

  export interface SearchOptions {
    query: string;
    time?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
    sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    limit?: number;
  }

  export interface Submission {
    id: string;
    title: string;
    author: string;
    subreddit: {
      display_name: string;
    };
    ups: number;
    downs: number;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
  }

  export interface Subreddit {
    display_name: string;
    search(options: SearchOptions): Promise<Submission[]>;
  }

  class Snoowrap {
    constructor(options: SnoowrapOptions);
    config(options: {
      requestDelay?: number;
      warnings?: boolean;
      continueAfterRatelimitError?: boolean;
    }): void;
    getSubreddit(name: string): Subreddit;
  }

  export default Snoowrap;
}
