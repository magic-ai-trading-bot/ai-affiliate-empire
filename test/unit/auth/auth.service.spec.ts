import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../src/common/auth/auth.service';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { LoggerService } from '../../../src/common/logging/logger.service';

// Mock bcrypt to avoid slow CPU-intensive hashing in tests
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
      };
      return config[key];
    }),
  };

  const mockLoggerService = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: registerDto.email }, { username: registerDto.username }],
        },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'Password123!',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException if username already exists', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        username: 'existinguser',
        password: 'Password123!',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(service.register(registerDto)).rejects.toThrow('Username already taken');
    });
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      const result = await service.validateUser('testuser', 'Password123!');

      expect(result).toBeDefined();
      expect(result.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'Password123!');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });

      // Mock bcrypt.compare to return false for wrong password
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.validateUser('testuser', 'WrongPassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should successfully login and return tokens', async () => {
      const loginDto = { username: 'testuser', password: 'Password123!' };
      const hashedPassword = await bcrypt.hash('Password123!', 10);

      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: hashedPassword,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      const loginDto = { username: 'testuser', password: 'WrongPassword' };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logout(mockUser.id);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refreshToken: null },
      });
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      mockJwtService.verify.mockReturnValue({ sub: mockUser.id });
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        refreshToken: hashedRefreshToken,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
