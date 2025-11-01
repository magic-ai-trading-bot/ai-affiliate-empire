import {
  Controller,
  Get,
  Delete,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { GdprService } from './gdpr.service';
import { UpdateConsentDto, ConsentResponseDto } from './dto/consent.dto';

@ApiTags('gdpr')
@Controller('api/users/:userId')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get('data')
  @ApiOperation({ summary: 'Export user data (GDPR Right to Access)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User data exported successfully',
    type: 'application/json',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportUserData(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const userData = await this.gdprService.exportUserData(userId);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-${userId}-${Date.now()}.json"`,
    );

    return res.send(JSON.stringify(userData, null, 2));
  }

  @Delete('data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user data (GDPR Right to Erasure)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User data deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUserData(@Param('userId') userId: string): Promise<void> {
    await this.gdprService.deleteUserData(userId);
  }

  @Get('consent')
  @ApiOperation({ summary: 'Get user consent preferences' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Consent preferences retrieved',
    type: ConsentResponseDto,
  })
  async getConsent(
    @Param('userId') userId: string,
  ): Promise<ConsentResponseDto> {
    return this.gdprService.getConsent(userId);
  }

  @Put('consent')
  @ApiOperation({ summary: 'Update user consent preferences' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Consent preferences updated',
    type: ConsentResponseDto,
  })
  async updateConsent(
    @Param('userId') userId: string,
    @Body() updateConsentDto: UpdateConsentDto,
  ): Promise<ConsentResponseDto> {
    return this.gdprService.updateConsent(userId, updateConsentDto);
  }

  @Get('data-portability')
  @ApiOperation({
    summary: 'Get user data in portable format (GDPR Right to Portability)',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Portable data package generated',
  })
  async getPortableData(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    const portableData = await this.gdprService.getPortableData(userId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="portable-data-${userId}-${Date.now()}.json"`,
    );

    return res.send(JSON.stringify(portableData, null, 2));
  }
}
