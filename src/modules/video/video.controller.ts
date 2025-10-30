import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { GenerateVideoDto } from './dto/generate-video.dto';

@ApiTags('video')
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate video from product' })
  @ApiResponse({ status: 200, description: 'Video generation started' })
  async generateVideo(@Body() dto: GenerateVideoDto) {
    return this.videoService.generateVideo(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video by ID' })
  @ApiResponse({ status: 200, description: 'Video details' })
  async getVideo(@Param('id') id: string) {
    return this.videoService.findById(id);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get videos for product' })
  async getVideosByProduct(@Param('productId') productId: string) {
    return this.videoService.findByProduct(productId);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate video' })
  async regenerateVideo(@Param('id') id: string) {
    return this.videoService.regenerateVideo(id);
  }
}
