import { Injectable, Logger } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { 
  GenerateVideoDto, 
  RemixVideoDto 
} from './dto/video.dto';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(private readonly openAIService: OpenAIService) {}

  async generateVideo(dto: GenerateVideoDto, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Generating video with prompt: ${dto.prompt}`);
    return await this.openAIService.generateVideo(dto.prompt, dto.model, {
      size: dto.size,
      duration: dto.duration,
    }, userApiKey, provider);
  }

  async generateVideoFromImage(image: Express.Multer.File, dto: GenerateVideoDto, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Generating video from image with prompt: ${dto.prompt}`);
    return await this.openAIService.generateVideoFromImage(image, dto.prompt, dto.model, {
      size: dto.size,
      duration: dto.duration,
    }, userApiKey, provider);
  }

  async getVideoStatus(videoId: string, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Getting status for video: ${videoId}`);
    return await this.openAIService.getVideoStatus(videoId, userApiKey, provider);
  }

  async listVideos(limit?: number, after?: string, userApiKey?: string, order?: 'asc' | 'desc', provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log('Listing videos');
    return await this.openAIService.listVideos({ limit, after, order }, userApiKey, provider);
  }

  async deleteVideo(videoId: string, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Deleting video: ${videoId}`);
    return await this.openAIService.deleteVideo(videoId, userApiKey, provider);
  }

  async remixVideo(dto: RemixVideoDto, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Remixing video ${dto.videoId} with prompt: ${dto.prompt}`);
    return await this.openAIService.remixVideo(dto.videoId, dto.prompt, userApiKey, provider);
  }

  async downloadVideoContent(videoId: string, userApiKey?: string, provider?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    this.logger.log(`Downloading content for video: ${videoId}`);
    return await this.openAIService.downloadVideoContent(videoId, userApiKey, provider);
  }
}

