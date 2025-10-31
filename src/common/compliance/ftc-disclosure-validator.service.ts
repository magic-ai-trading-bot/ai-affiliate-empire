import { Injectable } from '@nestjs/common';

export interface ValidationResult {
  isValid: boolean;
  hasDisclosure: boolean;
  disclosureText?: string;
  issues: string[];
}

@Injectable()
export class FtcDisclosureValidatorService {
  private readonly requiredKeywords = [
    'affiliate',
    'commission',
    'earn',
    'associate',
    '#ad',
    '#sponsored',
  ];

  private readonly ftcPatterns = [
    /as an? (?:amazon )?associate,?\s*i earn from qualifying purchases/i,
    /#ad\b/i,
    /#sponsored\b/i,
    /affiliate link/i,
    /i (?:may |might )?earn (?:a )?commission/i,
    /paid partnership/i,
  ];

  /**
   * Validate if content contains proper FTC disclosure
   */
  validateContent(content: string): ValidationResult {
    const issues: string[] = [];
    let hasDisclosure = false;
    let disclosureText: string | undefined;

    // Check for disclosure patterns
    for (const pattern of this.ftcPatterns) {
      const match = content.match(pattern);
      if (match) {
        hasDisclosure = true;
        disclosureText = match[0];
        break;
      }
    }

    if (!hasDisclosure) {
      issues.push('Missing FTC disclosure statement');
      issues.push('Content must include affiliate relationship disclosure');
    }

    // Check disclosure placement (should be near beginning)
    if (hasDisclosure && disclosureText) {
      const disclosurePosition = content.toLowerCase().indexOf(disclosureText.toLowerCase());
      const contentLength = content.length;

      // Disclosure should be in first 75% of content
      if (disclosurePosition > contentLength * 0.75) {
        issues.push('Disclosure appears too late in content (should be prominent and early)');
      }
    }

    // Check disclosure clarity
    if (hasDisclosure && disclosureText) {
      if (disclosureText.length < 10) {
        issues.push('Disclosure may be too vague or unclear');
      }
    }

    return {
      isValid: hasDisclosure && issues.length === 0,
      hasDisclosure,
      disclosureText,
      issues,
    };
  }

  /**
   * Add FTC disclosure to content if missing
   */
  ensureDisclosure(content: string, platform: 'youtube' | 'tiktok' | 'instagram' | 'blog'): string {
    const validation = this.validateContent(content);

    if (validation.hasDisclosure) {
      return content;
    }

    // Add platform-appropriate disclosure
    const disclosure = this.getDisclosureForPlatform(platform);

    // Add disclosure at the end with clear separation
    return `${content}\n\n${disclosure}`;
  }

  /**
   * Get platform-specific disclosure format
   */
  private getDisclosureForPlatform(platform: string): string {
    const disclosures: Record<string, string> = {
      youtube: '[DISCLOSURE]\nAs an Amazon Associate, I earn from qualifying purchases. This video contains affiliate links, which means I may earn a commission if you click through and make a purchase at no additional cost to you.',

      tiktok: '#ad #affiliate\nAs an Amazon Associate, I earn from qualifying purchases.',

      instagram: '#ad #affiliate #amazonfind\nDisclosure: This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases at no extra cost to you.',

      blog: '**Disclosure:** This post contains affiliate links. As an Amazon Associate, I earn from qualifying purchases. This means if you click on a link and make a purchase, I may receive a small commission at no extra cost to you. I only recommend products I genuinely believe in.',
    };

    return disclosures[platform] || disclosures.blog;
  }

  /**
   * Validate video script specifically
   */
  validateVideoScript(script: string): ValidationResult {
    const result = this.validateContent(script);

    // Additional video-specific checks
    const wordCount = script.split(/\s+/).length;
    const hasDisclosureSection = /\[DISCLOSURE\]/i.test(script);

    if (!hasDisclosureSection && wordCount > 50) {
      result.issues.push('Video script missing [DISCLOSURE] section marker');
    }

    // Check if disclosure is spoken (not just visual)
    if (result.hasDisclosure) {
      const disclosureWords = result.disclosureText?.split(/\s+/).length || 0;
      if (disclosureWords < 5) {
        result.issues.push('Spoken disclosure should be at least 5 words for clarity');
      }
    }

    result.isValid = result.hasDisclosure && result.issues.length === 0;
    return result;
  }

  /**
   * Validate social media caption
   */
  validateSocialCaption(caption: string, platform: 'tiktok' | 'instagram' | 'youtube'): ValidationResult {
    const result = this.validateContent(caption);

    // Check for hashtag disclosure (required for social media)
    const hasHashtagAd = /#ad\b/i.test(caption);
    const hasAffiliate = /#affiliate\b/i.test(caption);

    if (!hasHashtagAd && !hasAffiliate) {
      result.issues.push('Social media posts should include #ad or #affiliate hashtag');
      result.isValid = false;
    }

    // Check disclosure is prominent (within first 3 lines)
    const lines = caption.split('\n');
    const disclosureInFirstLines = lines.slice(0, 3).some(line =>
      /#ad\b/i.test(line) || /#affiliate\b/i.test(line) || /disclosure/i.test(line)
    );

    if (result.hasDisclosure && !disclosureInFirstLines) {
      result.issues.push('Disclosure should appear in the first 3 lines for visibility');
    }

    return result;
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(validations: Map<string, ValidationResult>): {
    compliantCount: number;
    nonCompliantCount: number;
    complianceRate: number;
    issues: string[];
  } {
    let compliantCount = 0;
    let nonCompliantCount = 0;
    const allIssues: string[] = [];

    for (const [contentId, result] of validations.entries()) {
      if (result.isValid) {
        compliantCount++;
      } else {
        nonCompliantCount++;
        allIssues.push(`${contentId}: ${result.issues.join(', ')}`);
      }
    }

    const total = compliantCount + nonCompliantCount;
    const complianceRate = total > 0 ? (compliantCount / total) * 100 : 0;

    return {
      compliantCount,
      nonCompliantCount,
      complianceRate: Math.round(complianceRate * 100) / 100,
      issues: allIssues,
    };
  }
}
