import { Injectable } from '@nestjs/common';
import { OpenAIService } from './openai.service';

interface GenerateScriptParams {
  productTitle: string;
  productDescription: string;
  price: number;
  category: string;
  affiliateUrl: string;
  language?: string;
  tone?: string;
}

interface ScriptOutput {
  script: string;
  estimatedDuration: number;
  hooks: string[];
  cta: string;
}

@Injectable()
export class ScriptGeneratorService {
  constructor(private readonly openai: OpenAIService) {}

  async generate(params: GenerateScriptParams): Promise<ScriptOutput> {
    const {
      productTitle,
      productDescription,
      price,
      category,
      language = 'en',
      tone = 'engaging',
    } = params;

    console.log(`🎬 Generating ${language} script for: ${productTitle}`);

    const systemPrompt = this.getSystemPrompt(language, tone);
    const userPrompt = this.buildPrompt(params);

    let scriptText: string;

    if (this.openai.isConfigured()) {
      scriptText = await this.openai.generateText(userPrompt, {
        systemPrompt,
        temperature: 0.8,
        maxTokens: 500,
      });
    } else {
      // Fallback to template-based generation
      scriptText = this.generateTemplateScript(params);
    }

    // Parse script components
    const hooks = this.extractHooks(scriptText);
    const cta = this.extractCTA(scriptText);
    const estimatedDuration = this.estimateDuration(scriptText);

    return {
      script: scriptText,
      estimatedDuration,
      hooks,
      cta,
    };
  }

  private getSystemPrompt(language: string, tone: string): string {
    const languageInstructions: Record<string, string> = {
      en: 'You are an expert video script writer for short-form content (TikTok, YouTube Shorts, Instagram Reels).',
      vi: 'Bạn là chuyên gia viết kịch bản video cho nội dung ngắn (TikTok, YouTube Shorts, Instagram Reels).',
      es: 'Eres un experto en escribir guiones de video para contenido corto (TikTok, YouTube Shorts, Instagram Reels).',
    };

    return `${languageInstructions[language] || languageInstructions['en']}

Your scripts must:
- Be 45-60 seconds long (approximately 120-150 words)
- Start with a strong hook in the first 3 seconds
- Be ${tone}, entertaining, and value-driven
- Include a clear call-to-action
- Comply with FTC guidelines (include disclosure)
- Be optimized for vertical video format
- Use conversational language

Structure:
1. Hook (3 seconds)
2. Problem/Pain Point (10 seconds)
3. Solution/Product Introduction (20 seconds)
4. Key Benefits (15 seconds)
5. Call-to-Action (7 seconds)
6. Disclosure (5 seconds)`;
  }

  private buildPrompt(params: GenerateScriptParams): string {
    const { productTitle, productDescription, price, category } = params;

    return `Create a compelling video script for this product:

Product: ${productTitle}
Category: ${category}
Price: $${price}
Description: ${productDescription}

Requirements:
- Grab attention immediately with a relatable hook
- Highlight 2-3 key benefits
- Create urgency without being pushy
- Include natural transition phrases for visual cuts
- End with clear CTA: "Link in bio"
- Add FTC disclosure: "As an Amazon Associate, I earn from qualifying purchases"

Output the complete script only, no additional formatting or notes.`;
  }

  private generateTemplateScript(params: GenerateScriptParams): string {
    const { productTitle, price } = params;

    return `[HOOK]
Wait... you've been looking for this everywhere!

[PROBLEM]
Tired of wasting money on products that don't deliver? I was too, until I found this gem.

[SOLUTION]
Introducing ${productTitle}! This is a total game-changer.

[BENEFITS]
Here's why you need this:
✓ Amazing quality
✓ Great value at just $${price}
✓ Thousands of 5-star reviews

[CTA]
Link is in my bio - you're gonna thank me later!

[DISCLOSURE]
As an Amazon Associate, I earn from qualifying purchases.`;
  }

  private extractHooks(script: string): string[] {
    // Extract sentences that could serve as hooks
    const sentences = script.split(/[.!?]+/).filter((s) => s.trim());
    return sentences.slice(0, 3).map((s) => s.trim());
  }

  private extractCTA(script: string): string {
    // Look for CTA patterns
    const ctaPatterns = [
      /link in .*bio/i,
      /check.*description/i,
      /get yours.*today/i,
      /don't miss out/i,
    ];

    for (const pattern of ctaPatterns) {
      const match = script.match(pattern);
      if (match) return match[0];
    }

    return 'Link in bio!';
  }

  private estimateDuration(script: string): number {
    // Estimate speaking duration: ~150 words per minute = 2.5 words per second
    const wordCount = script.split(/\s+/).length;
    const seconds = Math.ceil(wordCount / 2.5);
    return Math.min(seconds, 60); // Cap at 60 seconds for Shorts/Reels
  }
}
