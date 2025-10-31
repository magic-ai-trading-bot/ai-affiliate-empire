# Privacy Policy

**Last Updated:** October 31, 2025
**Effective Date:** October 31, 2025

## Introduction

This Privacy Policy describes how AI Affiliate Empire ("we", "us", or "our") collects, uses, stores, and protects your personal information when you use our automated affiliate marketing system and related services.

## 1. Information We Collect

### 1.1 Automatically Collected Information

**System Analytics Data:**
- Video performance metrics (views, watch time, engagement rates)
- Click-through rates and conversion data
- Platform-specific analytics (YouTube, TikTok, Instagram)
- Content performance indicators
- Revenue and commission tracking data

**Technical Information:**
- API usage logs and timestamps
- System performance metrics
- Error logs and debugging information
- Workflow execution data (Temporal)
- Cache and database query patterns

**Platform Integration Data:**
- OAuth tokens and authentication credentials (encrypted)
- Platform account identifiers
- Publishing timestamps and status
- Rate limit usage and quota information

### 1.2 User-Provided Information

**Account Setup:**
- Email address (for notifications)
- API credentials for affiliate networks
- Social media platform credentials
- Payment information for service subscription

**Configuration Data:**
- Niche preferences and targeting settings
- Content generation preferences
- Publishing schedules and frequency
- Optimization parameters

### 1.3 Information We Do NOT Collect

We do not collect:
- Personal viewing habits of end users watching content
- Biometric data
- Precise geolocation data beyond platform-provided analytics
- Payment card details (processed by third-party payment processors)

## 2. How We Use Your Information

### 2.1 Primary Uses

**Service Operation:**
- Generate and publish affiliate marketing content
- Track conversion performance and revenue
- Optimize content strategy based on analytics
- Manage API integrations with affiliate networks and social platforms

**System Optimization:**
- A/B test content variations
- Identify high-performing products and niches
- Scale successful strategies automatically
- Eliminate underperforming content approaches

**Technical Operations:**
- Monitor system health and performance
- Debug errors and improve reliability
- Ensure compliance with platform rate limits
- Maintain data consistency and integrity

### 2.2 Secondary Uses

**Business Intelligence:**
- Aggregate performance trends across users (anonymized)
- Improve AI content generation models
- Develop new features and optimizations
- Generate system usage reports

**Communications:**
- Send critical system notifications
- Alert on revenue milestones or issues
- Provide performance summaries
- Notify of policy changes or updates

## 3. Legal Basis for Processing (GDPR)

We process your data under the following legal bases:

- **Contract Performance**: Processing necessary to provide the service you've subscribed to
- **Legitimate Interest**: System optimization, fraud prevention, and security
- **Consent**: Marketing communications (opt-in only)
- **Legal Obligation**: Tax compliance, financial record-keeping

## 4. Data Storage and Security

### 4.1 Storage Location

**Primary Storage:**
- PostgreSQL database hosted on Fly.io (US and EU regions available)
- Encrypted at rest using AES-256 encryption
- Regular automated backups with 90-day retention

**Credential Storage:**
- AWS Secrets Manager for production credentials
- AES-256 encryption with automatic rotation support
- Access logging for compliance audits
- Environment variable fallback for development

**Content Storage:**
- Cloudflare R2 (S3-compatible) for videos and media
- CDN distribution for published content
- Automatic HTTPS encryption in transit

### 4.2 Security Measures

**Technical Safeguards:**
- TLS 1.3 encryption for all data in transit
- API rate limiting and throttling
- OAuth2 authentication for platform integrations
- Regular security patches and updates
- Intrusion detection and monitoring

**Access Controls:**
- Role-based access control (RBAC)
- Multi-factor authentication for admin access
- Audit logging of all sensitive operations
- Principle of least privilege enforcement

**Operational Security:**
- Regular security audits and penetration testing
- Incident response plan and procedures
- Data breach notification protocols
- Third-party security assessments

### 4.3 Data Retention

See our [Data Retention Policy](/docs/legal/DATA_RETENTION.md) for detailed information.

**Summary:**
- Analytics data: 2 years
- Financial records: 7 years (legal requirement)
- User account data: Active account + 30 days after deletion
- System logs: 90 days
- Backups: 90 days rolling retention

## 5. Data Sharing and Third Parties

### 5.1 Third-Party Services

We share data with the following service providers:

**AI and Content Generation:**
- OpenAI (GPT-5): Video script generation
- Anthropic (Claude 3.5): Blog post creation
- ElevenLabs: Voice synthesis
- DALL-E 3: Thumbnail generation
- Pika Labs: Video rendering

**Platform Integrations:**
- YouTube Data API
- TikTok Content API
- Instagram Graph API
- Amazon Associates Program
- ShareASale Network
- CJ Affiliate Network

**Infrastructure Providers:**
- Fly.io: Application hosting
- Cloudflare: CDN and storage (R2)
- AWS: Secrets management
- PostgreSQL: Database hosting

### 5.2 Data Processing Agreements

All third-party processors are:
- GDPR-compliant with Data Processing Agreements (DPAs)
- SOC 2 Type II certified where applicable
- Subject to contractual confidentiality obligations
- Prohibited from using data for their own purposes

### 5.3 No Data Selling

We DO NOT:
- Sell your personal information to third parties
- Share data with advertisers or data brokers
- Use your data for unrelated marketing purposes
- Transfer data outside approved service providers

## 6. International Data Transfers

### 6.1 Cross-Border Transfers

Data may be transferred to and processed in:
- United States (primary infrastructure)
- European Union (EU region hosting option)
- Countries where third-party services operate

### 6.2 Transfer Safeguards

For transfers outside the EU/EEA:
- Standard Contractual Clauses (SCCs) with all processors
- Adequacy decisions where applicable
- Privacy Shield successor frameworks (as available)
- Additional contractual protections

## 7. Your Privacy Rights

### 7.1 GDPR Rights (EU/EEA Users)

**Right to Access**: Request copy of your personal data
**Right to Rectification**: Correct inaccurate information
**Right to Erasure**: Request deletion of your data ("right to be forgotten")
**Right to Restriction**: Limit how we process your data
**Right to Portability**: Receive your data in machine-readable format
**Right to Object**: Object to processing based on legitimate interest
**Right to Withdraw Consent**: Withdraw consent for optional processing

### 7.2 CCPA Rights (California Users)

**Right to Know**: What data we collect, use, disclose
**Right to Delete**: Request deletion of personal information
**Right to Opt-Out**: Opt-out of data "sales" (we don't sell data)
**Right to Non-Discrimination**: Equal service regardless of privacy choices

### 7.3 How to Exercise Rights

**Contact Methods:**
- Email: privacy@ai-affiliate-empire.com
- Web Form: [Privacy Request Portal]
- Mail: [Physical Address - To Be Added]

**Response Timeline:**
- Initial response: Within 48 hours
- Fulfillment: Within 30 days (GDPR), 45 days (CCPA)
- Complex requests: 60-day extension with notice

## 8. Cookies and Tracking

### 8.1 Cookies We Use

See our [Cookie Policy](/docs/legal/COOKIE_POLICY.md) for detailed information.

**Essential Cookies:**
- Session management and authentication
- API request tracking
- Load balancing and performance

**Analytics Cookies:**
- System performance monitoring
- User behavior analysis (dashboard usage)
- Error tracking and debugging

**No Third-Party Advertising Cookies**

### 8.2 Cookie Management

Users can:
- Manage cookie preferences via dashboard settings
- Disable non-essential cookies
- Clear cookies through browser settings
- Opt-out of analytics tracking

## 9. Children's Privacy

Our service is NOT directed to individuals under 18 years of age.

We do not knowingly:
- Collect information from minors under 13 (COPPA)
- Process data of children under 16 without parental consent (GDPR)
- Target marketing content to children

If we discover data from a minor, we will delete it within 24 hours.

## 10. Data Breach Notification

### 10.1 Our Commitment

In the event of a data breach:
- Detection and containment within 24 hours
- Assessment of scope and impact within 48 hours
- Notification to affected users within 72 hours (GDPR requirement)
- Notification to supervisory authorities as required

### 10.2 What We'll Tell You

Breach notifications will include:
- Nature of the breach and data affected
- Likely consequences and risks
- Measures taken to address the breach
- Steps you should take to protect yourself
- Contact information for questions

## 11. AI and Automated Decision Making

### 11.1 Automated Systems

Our system uses AI for:
- Content generation (scripts, articles, videos)
- Product selection and ranking
- Performance optimization
- A/B testing and strategy adjustment

### 11.2 Human Oversight

**No Automated Decisions Affecting Rights:**
- No automated credit decisions
- No automated employment decisions
- No automated legal determinations
- Content publishing is operational, not rights-affecting

**You Have the Right To:**
- Understand how AI decisions are made
- Request human review of optimization decisions
- Opt-out of certain automated processing
- Access information about AI model logic

## 12. California "Shine the Light" Law

California residents can request:
- Categories of personal information disclosed to third parties
- Names and addresses of third parties receiving information
- Purpose of information sharing

Once per calendar year, free of charge.

## 13. Do Not Track Signals

Our system honors Do Not Track (DNT) browser signals:
- DNT enabled: No non-essential analytics tracking
- Only essential operational data collected
- No cross-site tracking or profiling

## 14. Changes to Privacy Policy

### 14.1 Update Process

We may update this policy:
- To reflect service changes
- For legal or regulatory compliance
- To improve clarity and transparency

### 14.2 Notification

**Material Changes:**
- Email notification to all users
- 30-day notice before changes take effect
- Prominent dashboard notification
- Archived versions available

**Minor Changes:**
- Updated "Last Updated" date
- Notification via dashboard
- Continued use constitutes acceptance

## 15. Contact Information

### 15.1 Privacy Inquiries

**Email**: privacy@ai-affiliate-empire.com
**Web Form**: [Privacy Portal URL]
**Response Time**: Within 48 hours

### 15.2 Data Protection Officer (if applicable)

**DPO Email**: dpo@ai-affiliate-empire.com
**DPO Mail**: [Physical Address]

### 15.3 Supervisory Authority

EU/EEA users can contact their local data protection authority:
- [EU DPA Directory](https://edpb.europa.eu/about-edpb/board/members_en)

California users:
- California Attorney General's Office
- California Privacy Protection Agency

## 16. Additional State-Specific Rights

### 16.1 Nevada Residents

Right to opt-out of data sales (we don't sell data, but you can confirm by emailing opt-out@ai-affiliate-empire.com).

### 16.2 Virginia Residents (VCDPA)

Similar rights to GDPR, including access, deletion, correction, and opt-out rights.

### 16.3 Colorado Residents (CPA)

Right to access, delete, correct data, and opt-out of targeted advertising and profiling.

## 17. Legal Compliance

This Privacy Policy complies with:
- EU General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA) / CPRA
- CAN-SPAM Act
- COPPA (Children's Online Privacy Protection Act)
- State-level privacy laws (Virginia, Colorado, etc.)

## 18. Dispute Resolution

**Preferred Method**: Contact privacy team for resolution

**Arbitration**: Disputes subject to arbitration as outlined in Terms of Service

**Governing Law**: [State/Country] law governs privacy disputes

## Acceptance

By using AI Affiliate Empire services, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

---

**Document Version**: 1.0
**Last Review Date**: October 31, 2025
**Next Review Date**: January 31, 2026
