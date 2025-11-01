import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerService } from '../../../common/secrets/secrets-manager.service';
import { OAuth2Service, OAuth2Tokens, OAuth2Config } from './oauth2.service';

/**
 * Instagram OAuth2 Service
 * Handles Instagram-specific OAuth2 flow with long-lived tokens (60-day expiration)
 *
 * Instagram OAuth2 Flow:
 * 1. Redirect user to Instagram authorization URL
 * 2. Exchange authorization code for short-lived token (1 hour)
 * 3. Exchange short-lived token for long-lived token (60 days)
 * 4. Refresh token before expiry (recommended: 10 days before)
 */
@Injectable()
export class InstagramOAuth2Service extends OAuth2Service {
  private readonly logger = new Logger(InstagramOAuth2Service.name);
  private businessAccountId: string | null = null;

  constructor(
    protected readonly config: ConfigService,
    protected readonly secretsManager: SecretsManagerService,
  ) {
    super(config, secretsManager);
  }

  /**
   * Get OAuth2 configuration for Instagram
   */
  protected getOAuth2Config(): OAuth2Config {
    return {
      clientId: this.config.get('FACEBOOK_APP_ID') || '',
      clientSecret: this.config.get('FACEBOOK_APP_SECRET') || '',
      redirectUri:
        this.config.get('INSTAGRAM_REDIRECT_URI') ||
        'http://localhost:3000/auth/instagram/callback',
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
      authUrl: 'https://www.instagram.com/oauth/authorize',
      tokenUrl: 'https://graph.instagram.com/oauth/access_token',
    };
  }

  /**
   * Exchange authorization code for tokens
   * Instagram requires two-step process: short-lived -> long-lived
   */
  async exchangeCodeForTokens(code: string): Promise<OAuth2Tokens> {
    const config = this.getOAuth2Config();

    try {
      // Step 1: Exchange code for short-lived token (1 hour)
      const shortLivedResponse = await this.httpClient.post(
        config.tokenUrl,
        new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri,
          code,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const shortLivedToken = shortLivedResponse.data.access_token;

      // Step 2: Exchange short-lived for long-lived token (60 days)
      const longLivedResponse = await this.httpClient.get(
        'https://graph.instagram.com/access_token',
        {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: config.clientSecret,
            access_token: shortLivedToken,
          },
        },
      );

      const tokens: OAuth2Tokens = {
        accessToken: longLivedResponse.data.access_token,
        expiresAt: new Date(Date.now() + longLivedResponse.data.expires_in * 1000),
      };

      this.tokens = tokens;
      await this.saveTokens(tokens);

      this.logger.log('Instagram long-lived token obtained successfully');

      return tokens;
    } catch (error: any) {
      throw new Error(`Instagram token exchange failed: ${error.message}`);
    }
  }

  /**
   * Refresh long-lived access token
   * Instagram tokens can be refreshed before expiry to get a fresh 60-day token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.accessToken) {
      throw new Error('No access token available to refresh');
    }

    try {
      const response = await this.httpClient.get(
        'https://graph.instagram.com/refresh_access_token',
        {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: this.tokens.accessToken,
          },
        },
      );

      this.tokens.accessToken = response.data.access_token;
      this.tokens.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

      await this.saveTokens(this.tokens);

      this.logger.log(
        `Instagram token refreshed successfully. Expires: ${this.tokens.expiresAt.toISOString()}`,
      );

      return this.tokens.accessToken;
    } catch (error: any) {
      throw new Error(`Instagram token refresh failed: ${error.message}`);
    }
  }

  /**
   * Ensure token is valid, refreshing if needed
   * Refresh token if less than 10 days remaining
   */
  async ensureValidToken(): Promise<string | null> {
    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens) {
      return null;
    }

    // Refresh if expiring in less than 10 days
    const remainingDays = this.getRemainingDays();
    if (remainingDays < 10 && remainingDays > 0) {
      this.logger.warn(`Instagram token expires in ${remainingDays} days. Refreshing now...`);
      await this.refreshAccessToken();
    }

    if (this.isTokenExpired()) {
      this.logger.error('Instagram token has expired. Re-authentication required.');
      return null;
    }

    return this.tokens.accessToken;
  }

  /**
   * Get remaining days until token expiry
   */
  getRemainingDays(): number {
    if (!this.tokens) {
      return -1;
    }

    const now = Date.now();
    const expiresAt = this.tokens.expiresAt.getTime();
    const remainingMs = expiresAt - now;

    return Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get Instagram business account ID
   */
  async getBusinessAccountId(): Promise<string> {
    if (this.businessAccountId) {
      return this.businessAccountId;
    }

    // Try to load from config first
    const configAccountId = this.config.get('INSTAGRAM_BUSINESS_ACCOUNT_ID');
    if (configAccountId) {
      this.businessAccountId = configAccountId;
      return configAccountId;
    }

    // If not in config, fetch from API (requires pages_show_list permission)
    // This is a placeholder - in production, you'd need to implement the full flow
    throw new Error(
      'Instagram business account ID not configured. Set INSTAGRAM_BUSINESS_ACCOUNT_ID in environment.',
    );
  }

  /**
   * Save tokens to secrets manager
   */
  protected async saveTokens(_tokens: OAuth2Tokens): Promise<void> {
    try {
      // For now, tokens are stored in-memory
      // In production, implement AWS Secrets Manager update/create API
      this.logger.log('Instagram tokens saved (in-memory)');
    } catch (error: any) {
      this.logger.error(`Failed to save Instagram tokens: ${error.message}`);
    }
  }

  /**
   * Load tokens from secrets manager
   */
  protected async loadTokens(): Promise<void> {
    try {
      const secrets = await this.secretsManager.getSecrets([
        { secretName: 'instagram-access-token', envVarName: 'INSTAGRAM_ACCESS_TOKEN' },
        { secretName: 'instagram-token-expires-at', envVarName: 'INSTAGRAM_TOKEN_EXPIRES_AT' },
        {
          secretName: 'instagram-business-account-id',
          envVarName: 'INSTAGRAM_BUSINESS_ACCOUNT_ID',
        },
      ]);

      const accessToken = secrets['instagram-access-token'];
      const expiresAt = secrets['instagram-token-expires-at'];
      const businessAccountId = secrets['instagram-business-account-id'];

      if (accessToken && expiresAt) {
        this.tokens = {
          accessToken,
          expiresAt: new Date(expiresAt),
        };
        this.logger.log('Instagram tokens loaded from secrets manager');
      }

      if (businessAccountId) {
        this.businessAccountId = businessAccountId;
      }
    } catch (error: any) {
      this.logger.warn(`Failed to load Instagram tokens: ${error.message}`);
    }
  }
}
