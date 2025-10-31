# Authentication & Authorization

**AI Affiliate Empire - Security Implementation Guide**

---

## Table of Contents

- [Overview](#overview)
- [JWT Authentication](#jwt-authentication)
- [API Key Management](#api-key-management)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Security Best Practices](#security-best-practices)
- [Implementation Guide](#implementation-guide)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Overview

The AI Affiliate Empire implements a comprehensive authentication and authorization system with multiple layers of security:

- **JWT Authentication**: Token-based authentication with refresh tokens
- **API Key Management**: Secure API key generation and rotation
- **RBAC**: Role-Based Access Control with granular permissions
- **Security Headers**: Helmet, CSP, CSRF protection
- **Audit Logging**: Complete authentication activity tracking

### Security Architecture

```
User Request → API Gateway → Authentication Middleware → RBAC Check → Protected Resource
                    ↓              ↓                       ↓
                Security      JWT Validation         Permission
                Headers       + Refresh              Verification
```

## JWT Authentication

### Token Structure

The system uses two types of tokens:

**Access Token** (Short-lived - 15 minutes):
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "admin",
  "permissions": ["read:products", "write:content"],
  "iat": 1698753600,
  "exp": 1698754500
}
```

**Refresh Token** (Long-lived - 7 days):
```json
{
  "sub": "user-id",
  "tokenId": "unique-token-id",
  "iat": 1698753600,
  "exp": 1699358400
}
```

### Authentication Flow

**1. Initial Login**:
```
User → POST /auth/login → Server validates credentials
    → Issues access token (15 min) + refresh token (7 days)
    → Returns both tokens to client
```

**2. Accessing Protected Resources**:
```
Client → Sends request with Authorization: Bearer <access-token>
    → Server validates token signature and expiration
    → If valid, processes request
    → If expired, returns 401 Unauthorized
```

**3. Token Refresh**:
```
Client → POST /auth/refresh with refresh token
    → Server validates refresh token
    → Issues new access token (15 min)
    → Optionally rotates refresh token
```

**4. Logout**:
```
Client → POST /auth/logout with refresh token
    → Server invalidates refresh token
    → Client discards both tokens
```

### Implementation

**Login Endpoint**:
```typescript
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,  // 15 minutes in seconds
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

**Refresh Token Endpoint**:
```typescript
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",  // Rotated
  "expiresIn": 900
}
```

**Logout Endpoint**:
```typescript
POST /auth/logout
Content-Type: application/json
Authorization: Bearer <access-token>

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "message": "Successfully logged out"
}
```

### Token Storage

**Client-Side Best Practices**:

✅ **Recommended**:
- Store access token in memory (JavaScript variable)
- Store refresh token in httpOnly cookie
- Use Secure flag for cookies in production
- Implement automatic token refresh before expiration

❌ **Avoid**:
- Storing tokens in localStorage (XSS vulnerable)
- Storing tokens in sessionStorage (limited benefit)
- Sending tokens in URL parameters
- Logging token values

**Example Client Implementation** (React):
```typescript
// Token management hook
const useAuth = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Include httpOnly cookie
    });

    const data = await response.json();
    setAccessToken(data.accessToken);
    // Refresh token stored in httpOnly cookie automatically
  };

  const refreshAccessToken = async () => {
    const response = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Send refresh token cookie
    });

    const data = await response.json();
    setAccessToken(data.accessToken);
  };

  const logout = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setAccessToken(null);
  };

  return { accessToken, login, refreshAccessToken, logout };
};
```

## API Key Management

### Overview

API keys provide programmatic access to the system without user interaction. Ideal for:
- Automation scripts
- CI/CD pipelines
- Third-party integrations
- Service-to-service communication

### API Key Structure

```
Format: aae_live_1234567890abcdef1234567890abcdef
        │   │    │
        │   │    └─ 32-character random key
        │   └────── Environment (live/test)
        └────────── Prefix (ai-affiliate-empire)
```

### Creating API Keys

**Generate New API Key**:
```typescript
POST /auth/api-keys
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "name": "Production Automation",
  "permissions": ["read:products", "write:content"],
  "expiresIn": 90  // days, optional
}

Response:
{
  "id": "key-id",
  "key": "aae_live_1234567890abcdef1234567890abcdef",
  "name": "Production Automation",
  "permissions": ["read:products", "write:content"],
  "createdAt": "2025-10-31T00:00:00Z",
  "expiresAt": "2026-01-29T00:00:00Z"
}
```

**⚠️ Important**: The API key is only shown once during creation. Store it securely.

### Using API Keys

**HTTP Header**:
```bash
curl -H "X-API-Key: aae_live_1234567890abcdef1234567890abcdef" \
     https://api.ai-affiliate-empire.com/products
```

**Alternative Header** (also supported):
```bash
curl -H "Authorization: ApiKey aae_live_1234567890abcdef1234567890abcdef" \
     https://api.ai-affiliate-empire.com/products
```

### Managing API Keys

**List All API Keys**:
```typescript
GET /auth/api-keys
Authorization: Bearer <admin-access-token>

Response:
{
  "keys": [
    {
      "id": "key-id-1",
      "name": "Production Automation",
      "permissions": ["read:products", "write:content"],
      "lastUsed": "2025-10-31T10:30:00Z",
      "createdAt": "2025-10-01T00:00:00Z",
      "expiresAt": "2026-01-29T00:00:00Z"
    }
  ]
}
```

**Revoke API Key**:
```typescript
DELETE /auth/api-keys/:keyId
Authorization: Bearer <admin-access-token>

Response:
{
  "message": "API key revoked successfully"
}
```

**Rotate API Key**:
```typescript
POST /auth/api-keys/:keyId/rotate
Authorization: Bearer <admin-access-token>

Response:
{
  "id": "key-id",
  "key": "aae_live_newkey1234567890abcdef1234567890",
  "name": "Production Automation",
  "permissions": ["read:products", "write:content"],
  "createdAt": "2025-10-31T00:00:00Z",
  "expiresAt": "2026-01-29T00:00:00Z"
}
```

### API Key Security

**Best Practices**:
- ✅ Rotate keys every 90 days
- ✅ Use different keys for different environments
- ✅ Limit permissions to minimum required
- ✅ Set expiration dates
- ✅ Monitor key usage and revoke unused keys
- ✅ Store keys in secure vaults (AWS Secrets Manager, HashiCorp Vault)
- ✅ Never commit keys to version control
- ✅ Use environment variables for deployment

**Key Rotation Schedule**:
- Development keys: 30 days
- Staging keys: 60 days
- Production keys: 90 days
- Critical access keys: 30 days

## Role-Based Access Control (RBAC)

### Roles

**Admin** (Full Access):
- All permissions
- User management
- System configuration
- API key management
- Audit log access

**Editor** (Content Management):
- Read/write content
- Read/write products
- Read analytics
- No system configuration
- No user management

**Viewer** (Read-Only):
- Read content
- Read products
- Read analytics
- No write permissions

**API User** (Programmatic Access):
- Configurable permissions via API keys
- No dashboard access
- Audit logged

### Permissions

**Content Permissions**:
- `read:content` - View content
- `write:content` - Create/update content
- `delete:content` - Delete content
- `publish:content` - Publish content to platforms

**Product Permissions**:
- `read:products` - View products
- `write:products` - Create/update products
- `delete:products` - Delete products

**Analytics Permissions**:
- `read:analytics` - View analytics
- `export:analytics` - Export analytics data

**System Permissions**:
- `manage:users` - Create/update/delete users
- `manage:api-keys` - Create/revoke API keys
- `manage:settings` - Update system settings
- `read:audit-logs` - View audit logs

### Implementing RBAC

**Check Permissions in Controllers**:
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RequirePermissions } from './decorators/permissions.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  @Get()
  @RequirePermissions('read:products')
  async findAll() {
    // Only users with read:products permission can access
  }

  @Post()
  @RequirePermissions('write:products')
  async create(@Body() createDto: CreateProductDto) {
    // Only users with write:products permission can access
  }

  @Delete(':id')
  @RequirePermissions('delete:products')
  async delete(@Param('id') id: string) {
    // Only users with delete:products permission can access
  }
}
```

**Multiple Permissions**:
```typescript
@Post('publish')
@RequirePermissions('write:content', 'publish:content')
async publish(@Body() publishDto: PublishDto) {
  // Requires BOTH write:content AND publish:content
}
```

**Role-Based Access**:
```typescript
import { RequireRoles } from './decorators/roles.decorator';

@Get('admin/settings')
@RequireRoles('admin')
async getSettings() {
  // Only admin role can access
}
```

## Security Best Practices

### Token Security

**JWT Secret Management**:
```bash
# Generate strong JWT secret (32+ characters)
openssl rand -base64 32

# Store in environment variables
JWT_SECRET=your-strong-random-secret-here
JWT_REFRESH_SECRET=different-strong-secret-for-refresh

# In production, use AWS Secrets Manager or similar
```

**Token Expiration**:
- Access tokens: 15 minutes (short-lived)
- Refresh tokens: 7 days (medium-lived)
- API keys: 90 days (configurable)

**Token Validation**:
- Signature verification
- Expiration check
- Issuer validation
- Audience validation
- Blacklist check (for revoked tokens)

### Password Security

**Password Requirements**:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not in common password list

**Password Hashing**:
```typescript
import * as bcrypt from 'bcrypt';

// Hash password with 12 salt rounds
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### Rate Limiting

**Authentication Endpoints**:
```typescript
// Login: 5 attempts per 15 minutes per IP
@Throttle(5, 15 * 60)
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}

// Refresh: 10 attempts per hour per user
@Throttle(10, 60 * 60)
@Post('refresh')
async refresh(@Body() refreshDto: RefreshDto) {
  // ...
}
```

**Account Lockout**:
- Lock account after 5 failed login attempts
- Lockout duration: 30 minutes
- Send email notification on lockout
- Admin can manually unlock

### Security Headers

**Helmet Configuration**:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

**CORS Configuration**:
```typescript
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
});
```

**CSRF Protection**:
```typescript
import * as csurf from 'csurf';

app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}));
```

### Audit Logging

All authentication events are logged:

**Logged Events**:
- Login success/failure
- Logout
- Token refresh
- API key creation/revocation
- Permission changes
- Role assignments
- Password changes
- Account lockouts

**Audit Log Format**:
```json
{
  "timestamp": "2025-10-31T10:30:00Z",
  "event": "login_success",
  "userId": "user-id",
  "email": "user@example.com",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "role": "admin",
    "loginMethod": "password"
  }
}
```

## Implementation Guide

### Setup Authentication Module

**1. Install Dependencies**:
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

**2. Configure JWT Module**:
```typescript
import { JwtModule } from '@nestjs/jwt';

JwtModule.register({
  secret: process.env.JWT_SECRET,
  signOptions: {
    expiresIn: '15m',
    issuer: 'ai-affiliate-empire',
    audience: 'api',
  },
});
```

**3. Create JWT Strategy**:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      issuer: 'ai-affiliate-empire',
      audience: 'api',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
    };
  }
}
```

**4. Create Auth Guard**:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

**5. Create Permission Guard**:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );
  }
}
```

## API Reference

### Authentication Endpoints

**POST /auth/register**
```typescript
// Register new user (admin only)
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "editor"
}

Response: 201 Created
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "editor",
  "createdAt": "2025-10-31T00:00:00Z"
}
```

**POST /auth/login**
```typescript
// User login
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "editor"
  }
}
```

**POST /auth/refresh**
```typescript
// Refresh access token
Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response: 200 OK
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

**POST /auth/logout**
```typescript
// User logout
Headers:
Authorization: Bearer <access-token>

Request:
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

Response: 200 OK
{
  "message": "Successfully logged out"
}
```

**POST /auth/change-password**
```typescript
// Change password
Headers:
Authorization: Bearer <access-token>

Request:
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}

Response: 200 OK
{
  "message": "Password changed successfully"
}
```

### API Key Endpoints

**POST /auth/api-keys**
```typescript
// Create API key (admin only)
Headers:
Authorization: Bearer <admin-access-token>

Request:
{
  "name": "Production Automation",
  "permissions": ["read:products", "write:content"],
  "expiresIn": 90
}

Response: 201 Created
{
  "id": "key-id",
  "key": "aae_live_1234567890abcdef1234567890abcdef",
  "name": "Production Automation",
  "permissions": ["read:products", "write:content"],
  "createdAt": "2025-10-31T00:00:00Z",
  "expiresAt": "2026-01-29T00:00:00Z"
}
```

**GET /auth/api-keys**
```typescript
// List API keys
Headers:
Authorization: Bearer <admin-access-token>

Response: 200 OK
{
  "keys": [
    {
      "id": "key-id-1",
      "name": "Production Automation",
      "permissions": ["read:products"],
      "lastUsed": "2025-10-31T10:30:00Z",
      "createdAt": "2025-10-01T00:00:00Z",
      "expiresAt": "2026-01-29T00:00:00Z"
    }
  ]
}
```

**DELETE /auth/api-keys/:keyId**
```typescript
// Revoke API key
Headers:
Authorization: Bearer <admin-access-token>

Response: 200 OK
{
  "message": "API key revoked successfully"
}
```

## Troubleshooting

### Common Issues

**1. Token Expired Error**
```
Error: jwt expired
Solution: Implement automatic token refresh before expiration
```

**2. Invalid Signature**
```
Error: invalid signature
Solution: Verify JWT_SECRET matches between token generation and validation
```

**3. Permission Denied**
```
Error: 403 Forbidden - Insufficient permissions
Solution: Check user role and required permissions match
```

**4. Account Locked**
```
Error: Account locked due to too many failed login attempts
Solution: Wait 30 minutes or contact admin to unlock
```

**5. API Key Not Working**
```
Error: 401 Unauthorized - Invalid API key
Solution: Verify API key format, expiration, and permissions
```

### Debug Mode

Enable authentication debugging:
```bash
# Enable auth debugging
DEBUG=auth:* npm run start:dev

# View authentication logs
tail -f logs/auth.log
```

### Testing Authentication

**Test Login**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**Test Protected Endpoint**:
```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer <access-token>"
```

**Test API Key**:
```bash
curl -X GET http://localhost:3000/products \
  -H "X-API-Key: aae_live_1234567890abcdef1234567890abcdef"
```

---

**Last Updated**: 2025-10-31
**Version**: 1.0.0
**Maintained By**: Security Team
