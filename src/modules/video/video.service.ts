import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { PikaLabsService } from './services/pikalabs.service';
import { ElevenLabsService } from './services/elevenlabs.service';
import { VideoComposerService } from './services/video-composer.service';
import { GenerateVideoDto } from './dto/generate-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pikaLabs: PikaLabsService,
    private readonly elevenLabs: ElevenLabsService,
    private readonly composer: VideoComposerService,
  ) {}

  async generateVideo(dto: GenerateVideoDto) {
    const { videoId, productId, script } = dto;

    let video;

    // If videoId provided, use existing video
    if (videoId) {
      video = await this.prisma.video.findUnique({
        where: { id: videoId },
        include: { product: true },
      });

      if (!video) {
        throw new NotFoundException(`Video with ID ${videoId} not found`);
      }
    }
    // If productId and script provided, create new video
    else if (productId && script) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`);
      }

      video = await this.prisma.video.create({
        data: {
          productId,
          title: `${product.title} - Video`,
          script,
          duration: 60,
          status: 'PENDING',
        },
        include: { product: true },
      });
    } else {
      throw new Error('Either videoId or (productId + script) must be provided');
    }

    console.log(`🎬 Starting video generation for: ${video.title}`);

    // Update status to GENERATING
    await this.prisma.video.update({
      where: { id: video.id },
      data: { status: 'GENERATING' },
    });

    try {
      // Step 1: Generate voice from script
      console.log('🎤 Generating voice...');
      const voiceUrl = await this.elevenLabs.generateVoice({
        text: video.script,
        voiceId: 'default',
      });

      // Step 2: Generate visuals from script
      console.log('🎨 Generating visuals...');
      const visualsUrl = await this.pikaLabs.generateVideo({
        prompt: this.createVisualPrompt(video),
        duration: video.duration,
      });

      // Step 3: Compose final video (combine voice + visuals)
      console.log('🎞️ Composing final video...');
      const finalVideoUrl = await this.composer.compose({
        voiceUrl,
        visualsUrl,
        script: video.script,
        product: video.product,
      });

      // Step 4: Generate thumbnail
      console.log('🖼️ Generating thumbnail...');
      const thumbnailUrl = await this.composer.generateThumbnail({
        videoUrl: finalVideoUrl,
        productTitle: video.product.title,
      });

      // Update video with generated assets
      const updatedVideo = await this.prisma.video.update({
        where: { id: video.id },
        data: {
          videoUrl: finalVideoUrl,
          voiceUrl,
          thumbnailUrl,
          status: 'READY',
          generatedAt: new Date(),
        },
      });

      console.log(`✅ Video generated successfully: ${video.id}`);

      return updatedVideo;
    } catch (error) {
      console.error(`❌ Video generation failed:`, error);

      // Update status to FAILED
      await this.prisma.video.update({
        where: { id: video.id },
        data: { status: 'FAILED' },
      });

      throw error;
    }
  }

  async findById(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        product: true,
        publications: {
          include: {
            analytics: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    return video;
  }

  async findByProduct(productId: string) {
    return this.prisma.video.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async regenerateVideo(id: string) {
    const video = await this.findById(id);

    return this.generateVideo({
      videoId: id,
      productId: video.productId,
      script: video.script,
    });
  }

  private createVisualPrompt(video: any): string {
    const product = video.product;

    // Create visual prompt based on product category
    const basePrompt = `High-quality product showcase video for ${product.title}. `;
    const stylePrompt = `Professional, clean, modern aesthetic. Vertical 9:16 format for social media. `;
    const actionPrompt = `Show product from multiple angles, highlight key features, lifestyle context. `;

    return basePrompt + stylePrompt + actionPrompt;
  }
}
