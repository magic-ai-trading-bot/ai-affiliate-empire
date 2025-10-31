import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class ApiKeyService {
  private readonly SALT_ROUNDS = 10;
  private readonly API_KEY_LENGTH = 32;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(ApiKeyService.name);
  }

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto) {
    const { name, permissions = [], expiresAt } = createApiKeyDto;

    // Generate random API key
    const apiKey = this.generateApiKey();
    const keyPrefix = apiKey.substring(0, 8);
    const keyHash = await bcrypt.hash(apiKey, this.SALT_ROUNDS);

    // Check if key name already exists for this user
    const existingKey = await this.prisma.apiKey.findFirst({
      where: { userId, name },
    });

    if (existingKey) {
      throw new ConflictException('API key with this name already exists');
    }

    // Create API key in database
    const apiKeyRecord = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPrefix,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        status: true,
        createdAt: true,
      },
    });

    this.logger.log(`API key created: ${name} (${keyPrefix}***) for user ${userId}`);

    // Return the API key only once (it won't be stored in plain text)
    return {
      ...apiKeyRecord,
      apiKey, // Only shown once during creation
    };
  }

  async validateApiKey(apiKey: string) {
    if (!apiKey || apiKey.length < 8) {
      return null;
    }

    const keyPrefix = apiKey.substring(0, 8);

    // Find API key by prefix for faster lookup
    const apiKeys = await this.prisma.apiKey.findMany({
      where: {
        keyPrefix,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            status: true,
          },
        },
      },
    });

    // Check each key with matching prefix
    for (const keyRecord of apiKeys) {
      const isValid = await bcrypt.compare(apiKey, keyRecord.keyHash);

      if (isValid) {
        // Check if key is expired
        if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
          // Mark as expired
          await this.prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { status: 'EXPIRED' },
          });
          return null;
        }

        // Check if user is active
        if (keyRecord.user.status !== 'ACTIVE') {
          return null;
        }

        // Update last used timestamp
        await this.prisma.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsedAt: new Date() },
        });

        return {
          id: keyRecord.id,
          userId: keyRecord.userId,
          role: keyRecord.user.role,
          permissions: keyRecord.permissions,
        };
      }
    }

    return null;
  }

  async getUserApiKeys(userId: string) {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys;
  }

  async getApiKeyById(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async updateApiKey(id: string, userId: string, updateApiKeyDto: UpdateApiKeyDto) {
    const { name, permissions, status } = updateApiKeyDto;

    // Check if API key exists
    const existingKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // Check if new name conflicts with another key
    if (name && name !== existingKey.name) {
      const duplicateKey = await this.prisma.apiKey.findFirst({
        where: {
          userId,
          name,
          id: { not: id },
        },
      });

      if (duplicateKey) {
        throw new ConflictException('API key with this name already exists');
      }
    }

    // Update API key
    const updatedKey = await this.prisma.apiKey.update({
      where: { id },
      data: {
        name: name || existingKey.name,
        permissions: permissions || existingKey.permissions,
        status: status || existingKey.status,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`API key updated: ${updatedKey.name} (${updatedKey.keyPrefix}***)`);

    return updatedKey;
  }

  async deleteApiKey(id: string, userId: string) {
    // Check if API key exists
    const existingKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!existingKey) {
      throw new NotFoundException('API key not found');
    }

    // Delete API key
    await this.prisma.apiKey.delete({
      where: { id },
    });

    this.logger.log(`API key deleted: ${existingKey.name} (${existingKey.keyPrefix}***)`);

    return { message: 'API key deleted successfully' };
  }

  async revokeApiKey(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (apiKey.status === 'REVOKED') {
      throw new BadRequestException('API key is already revoked');
    }

    const updatedKey = await this.prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
      },
    });

    this.logger.log(`API key revoked: ${updatedKey.name} (${updatedKey.keyPrefix}***)`);

    return updatedKey;
  }

  private generateApiKey(): string {
    return crypto.randomBytes(this.API_KEY_LENGTH).toString('hex');
  }
}
