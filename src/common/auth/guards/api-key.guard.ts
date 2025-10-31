import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKeyFromHeader(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    const apiKeyData = await this.apiKeyService.validateApiKey(apiKey);

    if (!apiKeyData) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach API key data to request
    request.user = {
      userId: apiKeyData.userId,
      role: apiKeyData.role,
      permissions: apiKeyData.permissions,
      apiKeyId: apiKeyData.id,
    };

    return true;
  }

  private extractApiKeyFromHeader(request: any): string | undefined {
    // Support both "X-API-Key" and "Authorization: ApiKey xxx" formats
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
