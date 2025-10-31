import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { ScriptGeneratorService } from './services/script-generator.service';
import { FtcDisclosureService } from '@/common/compliance/ftc-disclosure.service';
import { GenerateScriptDto } from './dto/generate-script.dto';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scriptGenerator: ScriptGeneratorService,
    private readonly ftcDisclosure: FtcDisclosureService,
  ) {}

  async generateScript(dto: GenerateScriptDto) {
    const { productId, language = 'en', tone = 'engaging' } = dto;

    // Get product details
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { network: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    console.log(`📝 Generating script for product: ${product.title}`);

    // Generate script using AI
    const scriptContent = await this.scriptGenerator.generate({
      productTitle: product.title,
      productDescription: product.description || '',
      price: product.price,
      category: product.category || 'General',
      affiliateUrl: product.affiliateUrl,
      language,
      tone,
    });

    // Add FTC disclosure to script
    const scriptWithDisclosure = this.ftcDisclosure.addDisclosure(
      scriptContent.script,
      'video',
      { enabled: true, position: 'bottom' },
    );

    // Create video record with script
    const video = await this.prisma.video.create({
      data: {
        productId: product.id,
        title: `${product.title} - Review`,
        script: scriptWithDisclosure,
        duration: scriptContent.estimatedDuration,
        language,
        status: 'PENDING',
      },
    });

    console.log(`✅ Script generated for video: ${video.id}`);

    return {
      videoId: video.id,
      script: scriptContent.script,
      estimatedDuration: scriptContent.estimatedDuration,
      hooks: scriptContent.hooks,
      cta: scriptContent.cta,
    };
  }

  async generateBlogPost(productId: string, language: string = 'en') {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    console.log(`📄 Generating blog post for: ${product.title}`);

    // TODO: Implement Claude-powered blog generation
    const blogContent = {
      title: `${product.title} Review: Is It Worth It?`,
      content: `Placeholder blog content for ${product.title}`,
      excerpt: `Comprehensive review of ${product.title}`,
    };

    // Add FTC disclosure to blog content
    const contentWithDisclosure = this.ftcDisclosure.addDisclosure(
      blogContent.content,
      'blog',
      { enabled: true, position: 'bottom' },
    );

    const blog = await this.prisma.blog.create({
      data: {
        productId: product.id,
        title: blogContent.title,
        slug: this.generateSlug(blogContent.title),
        content: contentWithDisclosure,
        excerpt: blogContent.excerpt,
        language,
        status: 'DRAFT',
      },
    });

    return blog;
  }

  async getScriptsByProduct(productId: string) {
    const videos = await this.prisma.video.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    return videos;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
