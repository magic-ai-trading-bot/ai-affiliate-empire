import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Ip, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NewsletterService, SubscribeDto, ConfirmSubscriptionDto, UnsubscribeDto } from './newsletter.service';

@ApiTags('Newsletter')
@Controller('blog/newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  @ApiResponse({ status: 200, description: 'Subscription successful' })
  @ApiResponse({ status: 400, description: 'Invalid email or bad request' })
  async subscribe(
    @Body('email') email: string,
    @Body('source') source?: string,
    @Body('referrer') referrer?: string,
    @Ip() ipAddress?: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const result = await this.newsletterService.subscribe({
      email,
      source,
      referrer,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      ...result,
    };
  }

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm newsletter subscription' })
  @ApiResponse({ status: 200, description: 'Subscription confirmed' })
  @ApiResponse({ status: 404, description: 'Invalid or expired token' })
  async confirm(@Query('token') token: string) {
    const result = await this.newsletterService.confirmSubscription({ token });

    return result;
  }

  @Get('unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from newsletter' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async unsubscribe(@Query('token') token: string) {
    const result = await this.newsletterService.unsubscribe({ token });

    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get newsletter statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats() {
    const stats = await this.newsletterService.getStats();

    return {
      success: true,
      data: stats,
    };
  }
}
