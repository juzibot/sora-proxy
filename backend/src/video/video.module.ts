import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { OpenAIService } from './openai.service';
import { AzureVideoProvider } from './providers/azure.video.provider';

@Module({
  imports: [HttpModule],
  controllers: [VideoController],
  providers: [VideoService, OpenAIService, AzureVideoProvider],
})
export class VideoModule {}

