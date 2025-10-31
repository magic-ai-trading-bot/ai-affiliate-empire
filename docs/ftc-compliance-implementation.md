# FTC Compliance Implementation

## Overview

Complete FTC (Federal Trade Commission) compliance system ensuring all affiliate content includes proper disclosures as required by law.

## Implementation Date
November 1, 2025

## Components

### 1. FtcDisclosureValidatorService
**Location:** `src/common/compliance/ftc-disclosure-validator.service.ts`

**Features:**
- Regex-based disclosure detection (7 patterns)
- Platform-specific validation (YouTube, TikTok, Instagram, Blog)
- Automatic fallback to add missing disclosures
- Disclosure placement validation (must be in first 75% of content)
- Disclosure clarity checks (minimum length requirements)
- Compliance reporting

**Supported Disclosure Formats:**
- Amazon Associate: "As an Amazon Associate, I earn from qualifying purchases"
- Hashtags: #ad, #sponsored, #affiliate
- Explicit: "affiliate link", "I earn a commission", "paid partnership"

### 2. ScriptGeneratorService Integration
**Location:** `src/modules/content/services/script-generator.service.ts:60-69`

**Behavior:**
- Validates ALL generated video scripts
- Auto-adds YouTube disclosure if AI omits it
- Logs compliance warnings and successes
- Ensures spoken disclosure is at least 5 words

**Example:**
```typescript
const validation = this.ftcValidator.validateVideoScript(scriptText);
if (!validation.isValid) {
  scriptText = this.ftcValidator.ensureDisclosure(scriptText, 'youtube');
}
```

### 3. PublisherService Integration
**Location:** `src/modules/publisher/publisher.service.ts:46-61`

**Behavior:**
- Validates TikTok/Instagram captions before publishing
- Auto-adds platform-specific disclosures
- Ensures FTC compliance at publish time
- Checks for #ad or #affiliate hashtags in first 3 lines

**Example:**
```typescript
if (['TIKTOK', 'INSTAGRAM'].includes(platform)) {
  const validation = this.ftcValidator.validateSocialCaption(caption, platform);
  if (!validation.isValid) {
    caption = this.ftcValidator.ensureDisclosure(caption, platform);
  }
}
```

## Platform-Specific Disclosures

### YouTube
```
[DISCLOSURE]
As an Amazon Associate, I earn from qualifying purchases. This video contains affiliate links, which means I may earn a commission if you click through and make a purchase at no additional cost to you.
```

### TikTok
```
#ad #affiliate
As an Amazon Associate, I earn from qualifying purchases.
```

### Instagram
```
#ad #affiliate #amazonfind
Disclosure: This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases at no extra cost to you.
```

### Blog
```
**Disclosure:** This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases. This means if you click on a link and make a purchase, I may receive a small commission at no extra cost to you. I only recommend products I genuinely believe in.
```

## Validation Rules

### Video Scripts
1. Must contain FTC disclosure
2. Must have [DISCLOSURE] section marker
3. Spoken disclosure must be ≥5 words for clarity
4. Disclosure should be in first 75% of script

### Social Media Captions
1. Must include #ad OR #affiliate hashtag
2. Disclosure must appear in first 3 lines for visibility
3. Must contain affiliate relationship statement
4. Hashtags must be prominent, not buried

## Testing

**Test Suite:** `test/unit/common/compliance/ftc-disclosure-validator.service.spec.ts`

**Coverage:** 26 tests covering:
- Amazon Associate disclosures
- Hashtag disclosures (#ad, #sponsored, #affiliate)
- Video script validation
- Social media caption validation
- Compliance reporting
- Edge cases (empty content, case sensitivity, spacing)

**Status:** ✅ All 26 tests passing

## Compliance Reporting

Generate compliance reports across multiple content pieces:

```typescript
const validations = new Map([
  ['video1', validation1],
  ['video2', validation2],
  // ...
]);

const report = ftcValidator.generateComplianceReport(validations);
// {
//   compliantCount: 8,
//   nonCompliantCount: 2,
//   complianceRate: 80,
//   issues: ['video2: Missing disclosure', 'video5: Disclosure too late']
// }
```

## Legal Compliance

This implementation ensures compliance with:
- **FTC 16 CFR Part 255** - Guides Concerning the Use of Endorsements and Testimonials
- **Amazon Associates Operating Agreement** - Section 5: Identifying Yourself as an Amazon Associate
- **Social Media Platform Requirements** - FTC disclosure guidelines for Instagram, TikTok, YouTube

## Monitoring & Alerts

**Automatic Actions:**
- ✅ Auto-add disclosure if missing (prevents violations)
- ⚠️ Log warning when disclosure added automatically
- ✅ Log success when content passes validation

**Production Monitoring:**
All content generation logs compliance status for audit trails.

## Maintenance

### Adding New Platforms
1. Add platform-specific disclosure to `getDisclosureForPlatform()`
2. Add validation method (e.g., `validateNewPlatformCaption()`)
3. Add tests for new platform
4. Update this documentation

### Adding New Disclosure Patterns
1. Add regex pattern to `ftcPatterns` array
2. Add test case for new pattern
3. Document in this file

## Related Files
- `src/common/compliance/compliance.module.ts` - Module configuration
- `src/common/compliance/ftc-disclosure.service.ts` - Disclosure text generation
- `src/modules/content/content.module.ts` - Content module integration
- `src/modules/publisher/publisher.module.ts` - Publisher module integration
- `src/temporal/activities/index.ts` - Temporal workflow integration

## Status: Production Ready ✅

All features implemented, tested, and integrated. System automatically ensures FTC compliance for all generated content.
