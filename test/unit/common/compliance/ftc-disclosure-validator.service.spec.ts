import { Test, TestingModule } from '@nestjs/testing';
import { FtcDisclosureValidatorService } from '@/common/compliance/ftc-disclosure-validator.service';

describe('FtcDisclosureValidatorService', () => {
  let service: FtcDisclosureValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FtcDisclosureValidatorService],
    }).compile();

    service = module.get<FtcDisclosureValidatorService>(FtcDisclosureValidatorService);
  });

  describe('validateContent', () => {
    it('should pass validation with Amazon Associate disclosure', () => {
      const content = 'Check this out! As an Amazon Associate, I earn from qualifying purchases.';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
      expect(result.disclosureText).toContain('Amazon Associate');
      expect(result.issues).toHaveLength(0);
    });

    it('should pass validation with #ad hashtag', () => {
      const content = 'Love this product! #ad #affiliate';
      const result = service.validateContent(content);

      expect(result.hasDisclosure).toBe(true);
      expect(result.disclosureText).toBe('#ad');
      // Note: May have clarity warning for short disclosure
    });

    it('should fail validation without disclosure', () => {
      const content = 'Check out this amazing product!';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(false);
      expect(result.hasDisclosure).toBe(false);
      expect(result.issues).toContain('Missing FTC disclosure statement');
    });

    it('should warn if disclosure appears too late', () => {
      const content = 'A'.repeat(1000) + ' As an Amazon Associate, I earn from qualifying purchases.';
      const result = service.validateContent(content);

      expect(result.hasDisclosure).toBe(true);
      expect(result.issues).toContain('Disclosure appears too late in content (should be prominent and early)');
    });

    it('should recognize affiliate link disclosure', () => {
      const content = 'This is an affiliate link - I may earn a commission.';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
    });

    it('should recognize sponsored content', () => {
      const content = 'Great product! #sponsored';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
    });

    it('should recognize paid partnership', () => {
      const content = 'Paid partnership with Brand X';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
    });
  });

  describe('ensureDisclosure', () => {
    it('should add YouTube disclosure if missing', () => {
      const content = 'Check out this product!';
      const result = service.ensureDisclosure(content, 'youtube');

      expect(result).toContain('[DISCLOSURE]');
      expect(result).toContain('Amazon Associate');
      expect(result).toContain('affiliate links');
    });

    it('should not modify content that already has disclosure', () => {
      const content = 'Check this out! #ad As an Amazon Associate, I earn from qualifying purchases.';
      const result = service.ensureDisclosure(content, 'youtube');

      expect(result).toBe(content);
    });

    it('should add TikTok disclosure if missing', () => {
      const content = 'Amazing product!';
      const result = service.ensureDisclosure(content, 'tiktok');

      expect(result).toContain('#ad');
      expect(result).toContain('#affiliate');
      expect(result).toContain('Amazon Associate');
    });

    it('should add Instagram disclosure if missing', () => {
      const content = 'Love this find!';
      const result = service.ensureDisclosure(content, 'instagram');

      expect(result).toContain('#ad');
      expect(result).toContain('#affiliate');
      expect(result).toContain('Amazon Associate');
    });

    it('should add blog disclosure if missing', () => {
      const content = 'This is a great product.';
      const result = service.ensureDisclosure(content, 'blog');

      expect(result).toContain('**Disclosure:**');
      expect(result).toContain('affiliate links');
      expect(result).toContain('Amazon Associate');
    });
  });

  describe('validateVideoScript', () => {
    it('should pass validation for compliant video script', () => {
      const script = `[HOOK]
Wait... you need to see this!

[PROBLEM]
Tired of wasting money?

[SOLUTION]
Check out this amazing product!

[CTA]
Link in bio!

[DISCLOSURE]
As an Amazon Associate, I earn from qualifying purchases.`;

      const result = service.validateVideoScript(script);

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail if [DISCLOSURE] section missing', () => {
      const script = 'A'.repeat(200);
      const result = service.validateVideoScript(script);

      expect(result.hasDisclosure).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      // Will have issues about missing disclosure
    });

    it('should fail if disclosure too short for video', () => {
      const script = `${'A'.repeat(200)}
[DISCLOSURE]
#ad`;

      const result = service.validateVideoScript(script);

      expect(result.issues).toContain('Spoken disclosure should be at least 5 words for clarity');
    });
  });

  describe('validateSocialCaption', () => {
    it('should pass validation for TikTok caption with #ad', () => {
      const caption = `#ad #affiliate
Check out this product!
As an Amazon Associate, I earn from qualifying purchases.`;

      const result = service.validateSocialCaption(caption, 'tiktok');

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
    });

    it('should fail if #ad or #affiliate missing on social media', () => {
      const caption = 'Check out this product! As an Amazon Associate, I earn from qualifying purchases.';
      const result = service.validateSocialCaption(caption, 'instagram');

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Social media posts should include #ad or #affiliate hashtag');
    });

    it('should warn if disclosure not in first 3 lines', () => {
      const caption = `Line 1
Line 2
Line 3
Line 4
#ad #affiliate`;

      const result = service.validateSocialCaption(caption, 'tiktok');

      expect(result.issues).toContain('Disclosure should appear in the first 3 lines for visibility');
    });

    it('should pass if disclosure in first 3 lines', () => {
      const caption = `#ad #affiliate
Check this out! As an Amazon Associate, I earn from qualifying purchases.
Amazing product!`;

      const result = service.validateSocialCaption(caption, 'instagram');

      expect(result.isValid).toBe(true);
      expect(result.hasDisclosure).toBe(true);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate correct compliance statistics', () => {
      const validations = new Map([
        ['content1', { isValid: true, hasDisclosure: true, issues: [] }],
        ['content2', { isValid: true, hasDisclosure: true, issues: [] }],
        ['content3', { isValid: false, hasDisclosure: false, issues: ['Missing disclosure'] }],
        ['content4', { isValid: false, hasDisclosure: false, issues: ['Missing disclosure'] }],
      ]);

      const report = service.generateComplianceReport(validations);

      expect(report.compliantCount).toBe(2);
      expect(report.nonCompliantCount).toBe(2);
      expect(report.complianceRate).toBe(50);
      expect(report.issues).toHaveLength(2);
    });

    it('should handle empty validations', () => {
      const validations = new Map();
      const report = service.generateComplianceReport(validations);

      expect(report.compliantCount).toBe(0);
      expect(report.nonCompliantCount).toBe(0);
      expect(report.complianceRate).toBe(0);
      expect(report.issues).toHaveLength(0);
    });

    it('should calculate 100% compliance rate', () => {
      const validations = new Map([
        ['content1', { isValid: true, hasDisclosure: true, issues: [] }],
        ['content2', { isValid: true, hasDisclosure: true, issues: [] }],
      ]);

      const report = service.generateComplianceReport(validations);

      expect(report.compliantCount).toBe(2);
      expect(report.nonCompliantCount).toBe(0);
      expect(report.complianceRate).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle case-insensitive disclosure detection', () => {
      const content = 'AS AN AMAZON ASSOCIATE, I EARN FROM QUALIFYING PURCHASES';
      const result = service.validateContent(content);

      expect(result.hasDisclosure).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should handle disclosure with extra spaces', () => {
      const content = 'As an Amazon Associate, I earn from qualifying purchases';
      const result = service.validateContent(content);

      expect(result.hasDisclosure).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('should handle empty content', () => {
      const content = '';
      const result = service.validateContent(content);

      expect(result.isValid).toBe(false);
      expect(result.hasDisclosure).toBe(false);
    });

    it('should handle very short content', () => {
      const content = '#ad';
      const result = service.validateContent(content);

      expect(result.hasDisclosure).toBe(true);
      expect(result.issues).toContain('Disclosure may be too vague or unclear');
    });
  });
});
