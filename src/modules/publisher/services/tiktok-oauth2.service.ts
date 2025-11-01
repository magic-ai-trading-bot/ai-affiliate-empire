import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import { OAuth2Service, OAuth2Tokens, OAuth2Config } from './oauth2.service';

/**
 * TikTok OAuth2 Service
 * Handles TikTok-specific OAuth2 authentication flow
 * TikTok uses OAuth 2.0 with user access tokens that expire in ~2 hours
 */
@Injectable()
export class TiktokOAuth2Service extends OAuth2Service {
  private readonly logger = new Logger(TiktokOAuth2Service.name);

  constructor(
    protected readonly config: ConfigService,
    protected readonly secretsManager: SecretsManagerService,
  ) {
    super(config, secretsManager);
  }

  /**
   * Get OAuth2 configuration for TikTok
   */
  protected getOAuth2Config(): OAuth2Config {
    return {
      clientId: this.config.get('TIKTOK_CLIENT_KEY') || '',
      clientSecret: this.config.get('TIKTOK_CLIENT_SECRET') || '',
      redirectUri:
        this.config.get('TIKTOK_REDIRECT_URI') || 'http://localhost:3000/auth/tiktok/callback',
      scopes: ['video.upload', 'user.info.basic'],
      authUrl: 'https://www.tiktok.com/v2/auth/authorize',
      tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    };
  }

  /**
   * Generate authorization URL for TikTok OAuth2 flow
   * Includes state parameter for CSRF protection
   */
  generateAuthUrl(state?: string): string {
    const config = this.getOAuth2Config();
    const params = new URLSearchParams({
      client_key: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(','),
      response_type: 'code',
    });

    if (state) {
      params.append('state', state);
    }

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * TikTok uses client_key instead of client_id
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Tokens> {
    const config = this.getOAuth2Config();

    try {
      const response = await this.httpClient.post(config.tokenUrl, {
        grant_type: 'authorization_code',
        code,
        client_key: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      });

      const data = response.data.data || response.data;

      const tokens: OAuth2Tokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };

      this.tokens = tokens;
      await this.saveTokens(tokens);

      this.logger.log('TikTok tokens exchanged successfully');

      return tokens;
    } catch (error: any) {
      throw new Error(`TikTok token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * TikTok uses client_key instead of client_id
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No TikTok refresh token available');
    }

    const config = this.getOAuth2Config();

    try {
      const response = await this.httpClient.post(config.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
        client_key: config.clientId,
        client_secret: config.clientSecret,
      });

      const data = response.data.data || response.data;

      this.tokens.accessToken = data.access_token;
      this.tokens.expiresAt = new Date(Date.now() + data.expires_in * 1000);

      // TikTok may return new refresh token
      if (data.refresh_token) {
        this.tokens.refreshToken = data.refresh_token;
      }

      await this.saveTokens(this.tokens);

      this.logger.log('TikTok access token refreshed');

      return this.tokens.accessToken;
    } catch (error: any) {
      throw new Error(`TikTok token refresh failed: ${error.message}`);
    }
  }

  /**
   * Save tokens to secrets manager
   */
  protected async saveTokens(_tokens: OAuth2Tokens): Promise<void> {
    try {
      // For now, tokens are stored in-memory
      // In production, implement AWS Secrets Manager update/create API
      this.logger.log('TikTok tokens saved (in-memory)');
    } catch (error: any) {
      this.logger.error(`Failed to save TikTok tokens: ${error.message}`);
    }
  }

  /**
   * Load tokens from secrets manager
   */
  protected async loadTokens(): Promise<void> {
    try {
      const secrets = await this.secretsManager.getSecrets([
        { secretName: 'tiktok-access-token', envVarName: 'TIKTOK_ACCESS_TOKEN' },
        { secretName: 'tiktok-refresh-token', envVarName: 'TIKTOK_REFRESH_TOKEN' },
        { secretName: 'tiktok-token-expires-at', envVarName: 'TIKTOK_TOKEN_EXPIRES_AT' },
      ]);

      const accessToken = secrets['tiktok-access-token'];
      const refreshToken = secrets['tiktok-refresh-token'];
      const expiresAt = secrets['tiktok-token-expires-at'];

      if (accessToken && expiresAt) {
        this.tokens = {
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresAt: new Date(expiresAt),
        };
        this.logger.log('TikTok tokens loaded from secrets manager');
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load TikTok tokens: ${error.message}`);
    }
  }
}
