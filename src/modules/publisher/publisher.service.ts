import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { PrismaService } from '@/common/database/prisma.service';
import { YoutubeService } from './services/youtube.service';
import { TiktokService } from './services/tiktok.service';
import { InstagramService } from './services/instagram.service';
import { PublishVideoDto } from './dto/publish-video.dto';
import { FtcDisclosureValidatorService } from '@/common/compliance/ftc-disclosure-validator.service';

@Injectable()
export class PublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YoutubeService,
    private readonly tiktok: TiktokService,
    private readonly instagram: InstagramService,
    private readonly ftcValidator: FtcDisclosureValidatorService,
  ) {}

  async publishVideo(dto: PublishVideoDto) {
    const { videoId, platforms, caption, hashtags } = dto;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      include: { product: true },
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found`);
    }

    if (video.status !== 'READY') {
      throw new Error(`Video is not ready for publishing. Current status: ${video.status}`);
    }

    console.log(`📤 Publishing video to: ${platforms.join(', ')}`);

    const publications = [];

    for (const platform of platforms) {
      try {
        // Generate caption and hashtags if not provided
        let finalCaption = caption || this.generateCaption(video);
        const finalHashtags = hashtags || this.generateHashtags(video);

        // Validate FTC compliance for social media platforms
        if (['TIKTOK', 'INSTAGRAM'].includes(platform)) {
          const platformType = platform.toLowerCase() as 'tiktok' | 'instagram';
          const validation = this.ftcValidator.validateSocialCaption(
            `${finalCaption} ${finalHashtags}`,
            platformType,
          );

          if (!validation.isValid) {
            console.warn(
              `⚠️ Caption for ${platform} missing FTC disclosure, adding automatically...`,
            );
            finalCaption = this.ftcValidator.ensureDisclosure(finalCaption, platformType);
            console.log(`✅ FTC disclosure added to ${platform} caption`);
          } else {
            console.log(`✅ Caption passes FTC compliance for ${platform}`);
          }
        }

        const publication = await this.publishToPlatform({
          video,
          platform,
          caption: finalCaption,
          hashtags: finalHashtags,
        });

        publications.push(publication);
      } catch (error) {
        console.error(`Error publishing to ${platform}:`, error);

        // Create failed publication record
        const failedPublication = await this.prisma.publication.create({
          data: {
            videoId: video.id,
            platform: platform as Platform,
            caption,
            hashtags,
            status: 'FAILED',
            errorMessage: error.message,
          },
        });

        publications.push(failedPublication);
      }
    }

    return {
      videoId: video.id,
      publications,
    };
  }

  private async publishToPlatform(params: {
    video: any;
    platform: string;
    caption: string;
    hashtags: string;
  }) {
    const { video, platform, caption, hashtags } = params;

    // Create publication record
    const publication = await this.prisma.publication.create({
      data: {
        videoId: video.id,
        platform: platform as Platform,
        caption,
        hashtags,
        status: 'PUBLISHING',
      },
    });

    try {
      let platformPostId: string;
      let url: string;

      switch (platform) {
        case 'YOUTUBE':
          const youtubeResult = await this.youtube.uploadShort({
            videoUrl: video.videoUrl,
            title: video.title,
            description: caption,
            thumbnailUrl: video.thumbnailUrl,
          });
          platformPostId = youtubeResult.videoId;
          url = youtubeResult.url;
          break;

        case 'TIKTOK':
          const tiktokResult = await this.tiktok.uploadVideo({
            videoUrl: video.videoUrl,
            caption: `${caption} ${hashtags}`,
          });
          platformPostId = tiktokResult.videoId;
          url = tiktokResult.url;
          break;

        case 'INSTAGRAM':
          const instagramResult = await this.instagram.uploadReel({
            videoUrl: video.videoUrl,
            caption: `${caption} ${hashtags}`,
          });
          platformPostId = instagramResult.videoId;
          url = instagramResult.url;
          break;

        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Update publication with success
      const updatedPublication = await this.prisma.publication.update({
        where: { id: publication.id },
        data: {
          platformPostId,
          url,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      console.log(`✅ Published to ${platform}: ${url}`);

      return updatedPublication;
    } catch (error) {
      // Update publication with error
      await this.prisma.publication.update({
        where: { id: publication.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          retryCount: publication.retryCount + 1,
        },
      });

      throw error;
    }
  }

  async getPublication(id: string) {
    const publication = await this.prisma.publication.findUnique({
      where: { id },
      include: {
        video: {
          include: {
            product: true,
          },
        },
        analytics: true,
      },
    });

    if (!publication) {
      throw new NotFoundException(`Publication with ID ${id} not found`);
    }

    return publication;
  }

  async getPublicationsByVideo(videoId: string) {
    return this.prisma.publication.findMany({
      where: { videoId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async retryPublication(id: string) {
    const publication = await this.getPublication(id);

    if (publication.status === 'PUBLISHED') {
      throw new Error('Publication already published successfully');
    }

    if (publication.retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    console.log(`🔄 Retrying publication: ${id}`);

    return this.publishToPlatform({
      video: publication.video,
      platform: publication.platform,
      caption: publication.caption || '',
      hashtags: publication.hashtags || '',
    });
  }

  private generateCaption(video: any): string {
    const product = video.product;

    return `Check out this ${product.title}!

${product.description?.substring(0, 100)}...

Link in bio! 🔗

#ad #affiliate`;
  }

  private generateHashtags(video: any): string {
    const product = video.product;
    const category = product.category?.toLowerCase().replace(/\s+/g, '') || 'products';

    const baseHashtags = ['#affiliate', '#productreview', '#trending', `#${category}`];

    // Add product-specific hashtags
    if (product.brand) {
      baseHashtags.push(`#${product.brand.toLowerCase().replace(/\s+/g, '')}`);
    }

    return baseHashtags.join(' ');
  }
}
