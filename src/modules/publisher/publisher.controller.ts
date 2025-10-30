import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublisherService } from './publisher.service';
import { PublishVideoDto } from './dto/publish-video.dto';

@ApiTags('publisher')
@Controller('publisher')
export class PublisherController {
  constructor(private readonly publisherService: PublisherService) {}

  @Post('publish')
  @ApiOperation({ summary: 'Publish video to platforms' })
  @ApiResponse({ status: 200, description: 'Video published' })
  async publishVideo(@Body() dto: PublishVideoDto) {
    return this.publisherService.publishVideo(dto);
  }

  @Get('publication/:id')
  @ApiOperation({ summary: 'Get publication details' })
  async getPublication(@Param('id') id: string) {
    return this.publisherService.getPublication(id);
  }

  @Get('video/:videoId/publications')
  @ApiOperation({ summary: 'Get all publications for video' })
  async getPublications(@Param('videoId') videoId: string) {
    return this.publisherService.getPublicationsByVideo(videoId);
  }

  @Post('publication/:id/retry')
  @ApiOperation({ summary: 'Retry failed publication' })
  async retryPublication(@Param('id') id: string) {
    return this.publisherService.retryPublication(id);
  }
}
