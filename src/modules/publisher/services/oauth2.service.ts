import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import axios, { AxiosInstance } from 'axios';

export interface OAuth2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

/**
 * Base OAuth2 service for managing authentication flows
 * Provides common OAuth2 functionality for all platform services
 */
@Injectable()
export abstract class OAuth2Service {
  protected httpClient: AxiosInstance;
  protected tokens: OAuth2Tokens | null = null;

  constructor(
    protected readonly config: ConfigService,
    protected readonly secretsManager: SecretsManagerService,
  ) {
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get OAuth2 configuration for the platform
   */
  protected abstract getOAuth2Config(): OAuth2Config;

  /**
   * Generate authorization URL for OAuth2 flow
   */
  generateAuthUrl(state?: string): string {
    const config = this.getOAuth2Config();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
    });

    if (state) {
      params.append('state', state);
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Tokens> {
    const config = this.getOAuth2Config();

    try {
      const response = await this.httpClient.post(config.tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      });

      const tokens: OAuth2Tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };

      this.tokens = tokens;
      await this.saveTokens(tokens);

      return tokens;
    } catch (error: any) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const config = this.getOAuth2Config();

    try {
      const response = await this.httpClient.post(config.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      });

      this.tokens.accessToken = response.data.access_token;
      this.tokens.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

      await this.saveTokens(this.tokens);

      return this.tokens.accessToken;
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get current access token, refreshing if necessary
   */
  async ensureValidToken(): Promise<string | null> {
    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens) {
      return null;
    }

    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Check if access token is expired
   */
  isTokenExpired(): boolean {
    if (!this.tokens) {
      return true;
    }

    // Consider expired 5 minutes before actual expiry
    const bufferMs = 5 * 60 * 1000;
    return Date.now() + bufferMs >= this.tokens.expiresAt.getTime();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokens && !this.isTokenExpired();
  }

  /**
   * Get current access token without refresh
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Save tokens to secrets manager
   */
  protected abstract saveTokens(tokens: OAuth2Tokens): Promise<void>;

  /**
   * Load tokens from secrets manager
   */
  protected abstract loadTokens(): Promise<void>;
}
