# Security Policy

## Known Security Issues

### Third-Party Dependencies

This project currently has known vulnerabilities in the following third-party packages:

#### 1. `snoowrap` (Reddit API Wrapper)
- **Status**: Unmaintained package with outdated dependencies
- **Affected Dependencies**:
  - `form-data` <2.5.4 (Critical)
  - `tough-cookie` <4.1.3 (Moderate)
  - `ws` 2.1.0-5.2.3 (High)
- **Usage**: Reddit trend analysis (`src/modules/product/services/trend-providers/reddit-trends.provider.ts`)
- **Mitigation**:
  - Reddit API access requires OAuth authentication
  - Feature can be disabled via configuration
  - Planned replacement with modern Reddit API client or direct API calls
- **Tracking**: Issue #TODO

#### 2. `paapi5-nodejs-sdk` (Amazon Product Advertising API)
- **Status**: Limited maintenance, uses outdated crypto-js
- **Affected Dependencies**:
  - `crypto-js` <4.2.0 (Critical) - PBKDF2 weakness
- **Usage**: Amazon product data fetching (`src/modules/product/services/amazon.service.ts`)
- **Mitigation**:
  - Amazon API requires signed requests with AWS credentials
  - crypto-js is not used for security-critical operations in our code
  - Planned replacement with AWS SDK v3 or alternative Amazon API client
- **Tracking**: Issue #TODO

### Risk Assessment

**Current Risk Level**: Low-Medium

**Rationale**:
- Vulnerabilities are in API client libraries, not core security components
- Both Reddit and Amazon APIs require proper authentication
- Application does not expose these libraries directly to user input
- Services are used in controlled, internal contexts only

### Planned Actions

1. **Short-term** (Current):
   - Document known issues
   - Monitor for security updates
   - Implement proper input validation around affected services

2. **Medium-term** (Next Quarter):
   - Replace `snoowrap` with direct Reddit API calls or modern alternative
   - Replace `paapi5-nodejs-sdk` with AWS SDK v3 or maintained alternative
   - Add security scanning in pre-commit hooks

3. **Long-term**:
   - Regular dependency audits
   - Automated dependency updates via Dependabot
   - Security testing in CI/CD pipeline

## Reporting a Vulnerability

If you discover a security vulnerability, please email: **[your-email]**

**Please do not** open public issues for security vulnerabilities.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies by severity (Critical: 7 days, High: 30 days, Medium: 90 days)

## Security Best Practices

When contributing to this project:

1. **Never commit secrets** (API keys, passwords, tokens)
2. **Use environment variables** for sensitive configuration
3. **Validate all user inputs** before processing
4. **Keep dependencies updated** (run `npm audit` regularly)
5. **Follow secure coding guidelines** in `docs/code-standards.md`

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Tools

This project uses:

- **npm audit**: Dependency vulnerability scanning
- **TruffleHog**: Secret detection in commits
- **ESLint**: Static code analysis with security rules
- **GitHub Dependabot**: Automated dependency updates (planned)

---

Last Updated: 2025-11-02
