# Data Retention Policy

**Last Updated:** October 31, 2025
**Effective Date:** October 31, 2025
**Policy Owner:** Data Protection Officer
**Review Cycle:** Quarterly

## 1. Purpose and Scope

### 1.1 Purpose

This Data Retention Policy establishes guidelines for:
- How long we retain different types of data
- When and how data is deleted
- Legal and regulatory compliance requirements
- Data subject rights under GDPR and CCPA

### 1.2 Scope

Applies to all data collected, processed, or stored by AI Affiliate Empire:
- User account information
- System-generated content
- Analytics and performance data
- Financial and transaction records
- System logs and technical data
- Backup and archived data

### 1.3 Legal Framework

Complies with:
- EU General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Sarbanes-Oxley Act (SOX) - financial records
- IRS record retention requirements
- State-specific data protection laws

## 2. Data Classification

### 2.1 Data Categories

**Category A - Critical Business Data:**
- Financial records and invoices
- Tax documentation
- Legal agreements and contracts
- Audit trails and compliance records

**Category B - User Account Data:**
- Personal identification information
- Account credentials and authentication
- Subscription and billing information
- User preferences and settings

**Category C - Operational Data:**
- Generated content (videos, articles, images)
- Publishing history and schedules
- API usage logs
- System performance metrics

**Category D - Analytics Data:**
- Performance metrics and KPIs
- Conversion tracking data
- Platform analytics (views, clicks, engagement)
- ROI and revenue calculations

**Category E - Technical Data:**
- Application logs
- Error reports and debugging data
- Security logs and access records
- Backup and recovery data

## 3. Retention Periods

### 3.1 Financial Records (Category A)

**Retention Period:** 7 years minimum

| Data Type | Retention | Legal Requirement |
|-----------|-----------|-------------------|
| Invoices and receipts | 7 years | IRS, SOX |
| Tax documents | 7 years | IRS |
| Subscription payments | 7 years | IRS, SOX |
| Refund records | 7 years | IRS |
| Financial reports | 7 years | SOX |
| Audit trails | 7 years | SOX, GDPR |

**Deletion Process:**
- Automated purge 7 years + 30 days after fiscal year end
- Secure deletion with 3-pass overwrite
- Deletion logged for audit purposes
- Legal holds override automatic deletion

**Legal Exceptions:**
- Ongoing litigation: Retain until case resolved + 1 year
- Tax audits: Retain until audit completed + 1 year
- Regulatory investigations: Indefinite hold until cleared

### 3.2 User Account Data (Category B)

**Retention Period:** Active account + 30 days after closure

| Data Type | Active Account | After Closure | Deletion Method |
|-----------|----------------|---------------|-----------------|
| Email address | Indefinite | 30 days | Immediate purge |
| Name and profile | Indefinite | 30 days | Anonymization |
| API credentials | Indefinite | Immediate | Secure deletion |
| OAuth tokens | Token lifetime | Immediate | Revocation + deletion |
| Payment methods | Subscription active | 30 days | PCI-compliant deletion |
| Account settings | Indefinite | 30 days | Database purge |
| Notification preferences | Indefinite | Immediate | Database purge |

**Account Closure Process:**

1. **T+0 (Closure Day):**
   - Immediate service suspension
   - Cancel all scheduled content
   - Revoke API tokens and credentials
   - Mark account for deletion

2. **T+0 to T+30 (Grace Period):**
   - Account reactivation available
   - Data export available upon request
   - Billing stopped
   - No new data collection

3. **T+30 (Final Deletion):**
   - Automated deletion script runs
   - Personal data purged from database
   - Backups flagged for eventual purge
   - Deletion confirmation email sent

**Exceptions:**
- Financial records retained per Category A rules
- Anonymized analytics may be retained indefinitely
- Legal hold overrides deletion schedule

### 3.3 Generated Content (Category C)

**Retention Period:** 2 years from publication date

| Content Type | Retention | Storage Location | Deletion Method |
|--------------|-----------|------------------|-----------------|
| Video files | 2 years | Cloudflare R2 | Automated deletion |
| Blog posts | 2 years | PostgreSQL | Database purge |
| Images/thumbnails | 2 years | Cloudflare R2 | Automated deletion |
| Audio files | 2 years | Cloudflare R2 | Automated deletion |
| Scripts and drafts | 2 years | PostgreSQL | Database purge |
| Published metadata | 2 years | PostgreSQL | Database purge |

**Publishing History:**
- Platform URLs: 2 years
- Publishing timestamps: 2 years
- Publishing status: 2 years
- Error logs: 90 days (separate retention)

**User-Requested Deletion:**
- Immediate removal from our systems
- Platform content remains (user must delete separately)
- Deletion confirmation within 48 hours
- Backups purged in next cycle (max 90 days)

**Special Cases:**
- DMCA takedowns: Retain complaint records 3 years
- Copyright disputes: Retain until resolved + 1 year
- Platform violations: Retain evidence 1 year

### 3.4 Analytics Data (Category D)

**Retention Period:** 2 years from collection date

| Data Type | Retention | Aggregation | Purpose |
|-----------|-----------|-------------|---------|
| Performance metrics | 2 years | Daily → Weekly → Monthly | ROI analysis |
| Conversion data | 2 years | Daily → Monthly | Optimization |
| Platform analytics | 2 years | Daily → Weekly | Strategy adjustment |
| Revenue tracking | 7 years | Daily → Monthly | Financial compliance |
| A/B test results | 2 years | Per test | Optimization insights |
| User behavior | 2 years | Anonymized | System improvement |

**Data Aggregation:**
- Raw data: 90 days
- Daily aggregates: 6 months
- Weekly aggregates: 1 year
- Monthly aggregates: 2 years
- Yearly aggregates: 7 years (revenue only)

**Anonymization Process:**
- Personal identifiers removed after 90 days
- IP addresses hashed after 30 days
- User IDs replaced with anonymous tokens
- Geographic data limited to country level

### 3.5 System Logs (Category E)

**Retention Period:** 90 days standard, 1 year for security logs

| Log Type | Retention | Purpose | Deletion Method |
|----------|-----------|---------|-----------------|
| Application logs | 90 days | Debugging | Automated rotation |
| Error logs | 90 days | Issue resolution | Automated rotation |
| Security logs | 1 year | Security audit | Secure deletion |
| Access logs | 1 year | Compliance audit | Secure deletion |
| API request logs | 90 days | Rate limiting | Automated rotation |
| Performance logs | 90 days | Optimization | Automated rotation |
| Temporal workflow logs | 90 days | Workflow debugging | Automated deletion |

**Log Rotation:**
- Daily rotation for high-volume logs
- Weekly archival to compressed format
- Monthly verification of deletion schedule
- Quarterly audit of retention compliance

**Security Log Exceptions:**
- Fraud investigations: Retain until resolved + 1 year
- Security breaches: 3 years minimum
- Legal holds: Indefinite until released

## 4. Backup and Archive Retention

### 4.1 Backup Schedule

**Production Backups:**
- **Full backups:** Weekly
- **Incremental backups:** Daily
- **Retention period:** 90 days rolling
- **Storage location:** Encrypted S3-compatible storage

**Disaster Recovery:**
- **Hot backups:** 7 days
- **Warm backups:** 30 days
- **Cold backups:** 90 days

### 4.2 Backup Deletion Process

**Automated Purge:**
- Backups older than 90 days automatically deleted
- Deletion runs daily at 2:00 AM UTC
- Deletion logged for audit trail
- Verification process ensures complete removal

**Data Subject Rights:**
- User requests deletion: Flag in all backups
- Backups older than request purged in normal cycle
- Maximum 90 days for complete removal
- User notified when fully deleted

### 4.3 Legal Hold on Backups

**When Legal Hold Applied:**
- Backups exempt from automatic deletion
- Specific data tagged and segregated
- Hold documented with case reference
- Regular review of hold necessity

## 5. Data Deletion Procedures

### 5.1 Deletion Methods

**Secure Deletion Standards:**

| Data Type | Method | Standard |
|-----------|--------|----------|
| Database records | Multi-pass overwrite | DOD 5220.22-M |
| File storage | 3-pass overwrite | NIST 800-88 |
| SSD/Flash storage | Cryptographic erasure | NIST 800-88 |
| Backup media | Physical destruction | NIST 800-88 |
| API credentials | Immediate revocation | Proprietary |

**Deletion Verification:**
- Automated verification scripts
- Sampling of deleted data locations
- Audit trail of all deletions
- Quarterly compliance review

### 5.2 Automated Deletion

**Scheduled Jobs:**

```
Daily 02:00 UTC:
- Purge expired OAuth tokens
- Delete logs older than retention period
- Remove temporary files and cache
- Archive eligible records

Weekly Sunday 03:00 UTC:
- Purge expired content (2+ years)
- Delete closed accounts (30+ days)
- Archive financial records
- Generate deletion report

Monthly 1st Day 04:00 UTC:
- Comprehensive retention audit
- Verify backup deletion
- Update retention metrics
- Generate compliance report
```

**Failure Handling:**
- Failed deletions logged and alerted
- Manual review within 24 hours
- Retry process with escalation
- Root cause analysis for repeated failures

### 5.3 Manual Deletion Requests

**User-Initiated Deletion:**

**Process Flow:**
1. User submits deletion request via dashboard or email
2. Identity verification (login or email confirmation)
3. Deletion scheduled within 48 hours
4. Immediate data access revocation
5. Complete deletion within 30 days (including backups)
6. Confirmation email sent to user

**Data Export Before Deletion:**
- User offered data export option
- 7-day window to request export
- Export provided in machine-readable format (JSON)
- Includes all personal data and generated content

**Exceptions to Deletion:**
- Financial records retained per legal requirements
- Anonymized analytics retained indefinitely
- Legal hold data exempt from deletion
- Fraud prevention data retained 1 year

## 6. Data Subject Rights

### 6.1 Right to Erasure (GDPR Article 17)

**Grounds for Erasure:**
- Data no longer necessary for original purpose
- User withdraws consent
- User objects to processing
- Data processed unlawfully
- Legal obligation requires deletion

**Erasure Timeline:**
- Request acknowledgment: 48 hours
- Erasure completion: 30 days
- Third-party notification: Within erasure timeline
- Confirmation to user: Upon completion

**Exceptions (Cannot Erase):**
- Compliance with legal obligations
- Exercise or defense of legal claims
- Public interest in data retention
- Archiving purposes with safeguards

### 6.2 Right to Restriction (GDPR Article 18)

**When Restriction Applies:**
- User contests data accuracy (during verification)
- Processing unlawful but user prefers restriction over erasure
- Data no longer needed but user needs for legal claims
- User objects to processing (pending verification)

**Restriction Implementation:**
- Data marked as restricted in database
- No processing except storage
- Access limited to legal purposes
- User notified before restriction lifted

### 6.3 Data Portability (GDPR Article 20)

**Exportable Data:**
- Account information and settings
- Generated content and metadata
- Analytics and performance data
- Subscription and billing history

**Export Format:**
- JSON (primary format)
- CSV for tabular data
- Original file formats for media (MP4, JPG, etc.)
- Provided via secure download link

## 7. Special Data Categories

### 7.1 Sensitive Personal Data

**Not Collected:**
- Health information
- Biometric data
- Political opinions
- Religious beliefs
- Sexual orientation

**If Accidentally Collected:**
- Immediate deletion upon discovery
- Incident report filed
- User notification within 72 hours
- Process review and prevention measures

### 7.2 Children's Data (COPPA/GDPR)

**Policy:**
- Service not directed to children under 18
- No knowing collection of children's data
- Immediate deletion if discovered
- Parental notification if applicable

**Discovery Process:**
- Age verification during signup
- Monitor for underage indicators
- Quarterly account review
- Immediate action upon discovery

## 8. Compliance and Auditing

### 8.1 Retention Compliance Monitoring

**Daily Monitoring:**
- Automated retention policy enforcement
- Deletion job success verification
- Exception flagging and alerting
- Compliance dashboard updates

**Monthly Audits:**
- Sample data retention verification
- Deletion procedure effectiveness
- Backup retention compliance
- Third-party processor compliance

**Quarterly Reviews:**
- Comprehensive policy audit
- Legal requirement updates
- Process improvement identification
- Stakeholder reporting

### 8.2 Audit Trail Requirements

**Logged Events:**
- All data deletion activities
- Retention policy changes
- Legal hold applications and releases
- User deletion requests
- Data export requests
- Compliance audit results

**Audit Log Retention:**
- 7 years for financial-related deletions
- 3 years for security-related deletions
- 2 years for general deletions

## 9. Third-Party Data Processors

### 9.1 Processor Responsibilities

**Contractual Requirements:**
- Processors must match or exceed our retention standards
- Data Processing Agreements (DPAs) required
- Sub-processor notification and approval
- Right to audit processor retention practices

**Key Processors:**

| Processor | Data Type | Their Retention | Our Oversight |
|-----------|-----------|-----------------|---------------|
| AWS | Credentials | Per our policy | Quarterly audit |
| Fly.io | Infrastructure | Per our policy | Monthly review |
| Cloudflare | Media files | Per our policy | Automated sync |
| OpenAI | API requests | 30 days | DPA compliance |
| Anthropic | API requests | 30 days | DPA compliance |

### 9.2 Processor Deletion Coordination

**When User Deletes Account:**
- Notify all processors within 48 hours
- Verify processor deletion within 30 days
- Document processor confirmation
- Include in user confirmation

## 10. Policy Governance

### 10.1 Policy Updates

**Review Schedule:**
- Quarterly internal review
- Annual legal compliance review
- Updates as regulations change
- Stakeholder feedback integration

**Update Process:**
1. Identify need for change
2. Draft proposed updates
3. Legal review and approval
4. Stakeholder notification (30-day notice)
5. Implementation and training
6. Documentation and archival

### 10.2 Training and Awareness

**Staff Training:**
- Annual data retention training for all staff
- Quarterly updates for technical team
- Role-specific training (support, legal, technical)
- Compliance test and certification

**User Education:**
- Retention policy summarized in Privacy Policy
- Dashboard access to retention information
- Self-service data export and deletion
- FAQ and support documentation

### 10.3 Exceptions and Waivers

**Exception Process:**
- Legal counsel approval required
- Documented business justification
- Limited duration (max 1 year)
- Regular review and renewal
- Audit trail maintained

**Legal Holds:**
- Only by legal counsel or executive team
- Documented with case reference
- Automated system to prevent deletion
- Quarterly review of active holds
- Formal release process

## 11. Contact and Compliance

### 11.1 Data Protection Contact

**General Inquiries:**
Email: privacy@ai-affiliate-empire.com
Response: Within 48 hours

**Deletion Requests:**
Email: deletion@ai-affiliate-empire.com
Portal: [Self-service deletion portal]
Response: Within 48 hours, completion within 30 days

**Compliance Officer:**
Email: dpo@ai-affiliate-empire.com
Role: Data Protection Officer (if applicable under GDPR)

### 11.2 Regulatory Authorities

**EU/EEA Users:**
Can contact local Data Protection Authority
[List of EU DPAs](https://edpb.europa.eu/about-edpb/board/members_en)

**California Users:**
California Privacy Protection Agency
[Contact Information]

## 12. Policy Acceptance

By using AI Affiliate Empire, you acknowledge:
- You understand our data retention practices
- You agree to retention periods outlined
- You know how to exercise data subject rights
- You understand deletion timelines

## Appendix A: Retention Period Summary

| Data Category | Retention Period | Deletion Method |
|---------------|------------------|-----------------|
| Financial records | 7 years | Secure overwrite |
| User accounts | Active + 30 days | Database purge |
| Generated content | 2 years | Automated deletion |
| Analytics data | 2 years | Aggregation + deletion |
| System logs | 90 days | Automated rotation |
| Security logs | 1 year | Secure deletion |
| Backups | 90 days rolling | Encrypted deletion |

## Appendix B: Deletion Request Form

**User Data Deletion Request**

1. Account email: ________________
2. Account ID (optional): ________________
3. Deletion reason (optional): ________________
4. Data export requested: Yes / No
5. Confirmation: I understand deletion is permanent

Submit to: deletion@ai-affiliate-empire.com

---

**Document Version:** 1.0
**Effective Date:** October 31, 2025
**Next Review:** January 31, 2026
**Policy Owner:** Data Protection Officer
**Approved By:** [Legal Counsel]
