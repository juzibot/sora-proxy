import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { 
  GenerateVideoDto, 
  RemixVideoDto 
} from './dto/video.dto';
import { ApiKey } from './decorators/api-key.decorator';
import { Response } from 'express';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  private toHttpException(error: any): HttpException {
    const status = error?.response?.status
      ?? (typeof error?.getStatus === 'function' ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR);
    const dataRaw = error?.response?.data
      ?? (typeof error?.getResponse === 'function' ? error.getResponse() : null);

    const message = dataRaw?.error?.message
      ?? dataRaw?.message
      ?? (typeof dataRaw === 'string' ? dataRaw : error?.message)
      ?? 'Unknown error';

    // Safely clone details to avoid circular structure errors in JSON serialization
    const safeClone = (val: any) => {
      try {
        if (val === undefined) return undefined;
        if (typeof val === 'string') return val;
        return JSON.parse(JSON.stringify(val));
      } catch {
        return undefined;
      }
    };

    const body = {
      message,
      code: dataRaw?.error?.code ?? dataRaw?.code,
      type: dataRaw?.error?.type ?? dataRaw?.type,
      upstream: 'openai',
      details: safeClone(dataRaw),
    };

    return new HttpException(body, status);
  }

  /**
   * Generate a new video from text prompt
   * POST /api/videos/generate
   */
  @Post('generate')
  async generateVideo(
    @Body() dto: GenerateVideoDto,
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      return await this.videoService.generateVideo(dto, apiKey, { provider, azureEndpoint, azureApiVersion, azureDeployment });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Get video generation status
   * GET /api/videos/:id
   */
  @Get(':id')
  async getVideoStatus(
    @Param('id') id: string,
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      return await this.videoService.getVideoStatus(id, apiKey, { provider, azureEndpoint, azureApiVersion, azureDeployment });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * List all videos
   * GET /api/videos
   */
  @Get()
  async listVideos(
    @Query('limit') limit?: number,
    @Query('after') after?: string,
    @Query('order') order?: 'asc' | 'desc',
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      return await this.videoService.listVideos(limit as any, after, apiKey, order, { provider, azureEndpoint, azureApiVersion, azureDeployment });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Delete a video
   * DELETE /api/videos/:id
   */
  @Delete(':id')
  async deleteVideo(
    @Param('id') id: string,
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      return await this.videoService.deleteVideo(id, apiKey, { provider, azureEndpoint, azureApiVersion, azureDeployment });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Remix a completed video with a new prompt
   * POST /api/videos/remix
   */
  @Post('remix')
  async remixVideo(
    @Body() dto: RemixVideoDto,
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      return await this.videoService.remixVideo(dto, apiKey, { provider, azureEndpoint, azureApiVersion, azureDeployment });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Download video content
   * GET /api/videos/:id/content
   */
  @Get(':id/content')
  async downloadContent(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('apiKey') apiKeyQuery?: string,
    @Query('provider') providerQuery?: 'openai' | 'azure',
    @Query('azureEndpoint') azureEndpointQuery?: string,
    @Query('azureVersion') azureApiVersionQuery?: string,
    @Query('azureDeployment') azureDeploymentQuery?: string,
    @Headers('x-provider') provider?: 'openai' | 'azure',
    @Headers('x-azure-endpoint') azureEndpoint?: string,
    @Headers('x-azure-version') azureApiVersion?: string,
    @Headers('x-azure-deployment') azureDeployment?: string,
    @ApiKey() apiKey?: string,
  ) {
    try {
      // Prefer query parameters (since <a href> cannot send custom headers)
      const effectiveApiKey = (apiKeyQuery || apiKey) as (string | undefined);
      const effectiveProvider = (providerQuery || provider) as ('openai' | 'azure' | undefined);
      const opts = {
        provider: effectiveProvider,
        azureEndpoint: azureEndpointQuery || azureEndpoint,
        azureApiVersion: azureApiVersionQuery || azureApiVersion,
        azureDeployment: azureDeploymentQuery || azureDeployment,
      } as {
        provider?: 'openai' | 'azure';
        azureEndpoint?: string;
        azureApiVersion?: string;
        azureDeployment?: string;
      };

      const stream = await this.videoService.downloadVideoContent(id, effectiveApiKey, opts);
      // Pass through streaming response
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="video-${id}.mp4"`);
      res.setHeader('Cache-Control', 'no-store');
      stream.pipe(res);
    } catch (error) {
      throw this.toHttpException(error);
    }
  }
}

