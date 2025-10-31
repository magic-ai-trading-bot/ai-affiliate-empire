import { Injectable } from '@nestjs/common';

export interface FtcDisclosureConfig {
  enabled: boolean;
  customText?: string;
  position?: 'top' | 'bottom' | 'both';
}

@Injectable()
export class FtcDisclosureService {
  private readonly defaultDisclosures = {
    amazon: 'As an Amazon Associate, I earn from qualifying purchases.',
    general:
      'This post contains affiliate links. This means I may receive a commission when you click on my affiliate links and make a purchase at no additional cost to you.',
    short: 'Affiliate links may earn commission.',
    detailed:
      'As an Amazon Associate and affiliate partner with various networks, I earn from qualifying purchases. This means I may receive a commission when you click on my affiliate links and make a purchase at no additional cost to you. I only recommend products and services I genuinely believe in and have researched thoroughly.',
  };

  /**
   * Get FTC disclosure for blog posts
   */
  getBlogDisclosure(config?: FtcDisclosureConfig): string {
    if (config?.enabled === false) return '';

    const disclosure = config?.customText || this.defaultDisclosures.detailed;

    return `\n\n---\n\n**Disclosure:** ${disclosure}\n\n---\n\n`;
  }

  /**
   * Get FTC disclosure for video descriptions
   */
  getVideoDisclosure(config?: FtcDisclosureConfig): string {
    if (config?.enabled === false) return '';

    const disclosure = config?.customText || this.defaultDisclosures.amazon;

    return `\n\n${disclosure}\n\n#ad #affiliate`;
  }

  /**
   * Get FTC disclosure for social media posts (short form)
   */
  getSocialDisclosure(config?: FtcDisclosureConfig): string {
    if (config?.enabled === false) return '';

    const disclosure = config?.customText || this.defaultDisclosures.short;

    return `\n\n${disclosure} #ad`;
  }

  /**
   * Add disclosure to content based on type
   */
  addDisclosure(
    content: string,
    type: 'blog' | 'video' | 'social',
    config?: FtcDisclosureConfig,
  ): string {
    const position = config?.position || 'bottom';

    let disclosure: string;
    switch (type) {
      case 'blog':
        disclosure = this.getBlogDisclosure(config);
        break;
      case 'video':
        disclosure = this.getVideoDisclosure(config);
        break;
      case 'social':
        disclosure = this.getSocialDisclosure(config);
        break;
      default:
        disclosure = '';
    }

    if (!disclosure) return content;

    switch (position) {
      case 'top':
        return disclosure + content;
      case 'bottom':
        return content + disclosure;
      case 'both':
        return disclosure + content + disclosure;
      default:
        return content + disclosure;
    }
  }

  /**
   * Validate if content contains FTC disclosure
   */
  hasDisclosure(content: string): boolean {
    const disclosureKeywords = [
      'affiliate',
      'commission',
      'earn from qualifying purchases',
      '#ad',
      'sponsored',
      'partnership',
    ];

    const lowerContent = content.toLowerCase();
    return disclosureKeywords.some((keyword) => lowerContent.includes(keyword));
  }

  /**
   * Get hashtags for social media compliance
   */
  getComplianceHashtags(): string[] {
    return ['#ad', '#affiliate', '#sponsored', '#partnership'];
  }

  /**
   * Format disclosure for specific platform
   */
  formatForPlatform(
    disclosure: string,
    platform: 'youtube' | 'tiktok' | 'instagram',
  ): string {
    switch (platform) {
      case 'youtube':
        // YouTube requires disclosure in description
        return `📢 DISCLOSURE\n${disclosure}\n`;

      case 'tiktok':
        // TikTok prefers short form with hashtags
        return `${this.defaultDisclosures.short}\n#TikTokMadeMeBuyIt #ad`;

      case 'instagram':
        // Instagram requires visible disclosure
        return `⚠️ ${disclosure}\n#ad #sponsored`;

      default:
        return disclosure;
    }
  }

  /**
   * Get disclosure reminder for content creators
   */
  getCreatorReminder(): string {
    return `
IMPORTANT: FTC Compliance Reminder
-----------------------------------
✓ All affiliate links must be clearly disclosed
✓ Disclosure must be prominent and unavoidable
✓ Use clear language like "affiliate link" or "I earn commission"
✓ Place disclosure BEFORE affiliate links
✓ Include #ad hashtag for social media posts
✓ Update disclosure if compensation changes

Failure to disclose may result in FTC penalties.
    `.trim();
  }
}
