import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { ApiKeyGuard } from './guards/api-key.guard';
import { DatabaseModule } from '../database/database.module';
import { LoggerModule } from '../logging/logger.module';

@Module({
  imports: [
    DatabaseModule,
    LoggerModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    ApiKeyService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ApiKeyGuard,
  ],
  exports: [
    AuthService,
    ApiKeyService,
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    PermissionsGuard,
    ApiKeyGuard,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
