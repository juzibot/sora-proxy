import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class GenerateVideoDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  model?: string = 'sora-2';

  @IsOptional()
  @IsString()
  @IsIn(['720x1280', '1280x720', '1024x1792', '1792x1024'])
  size?: string;

  @IsOptional()
  @IsNumber()
  @IsIn([4, 8, 12])
  duration?: number;
}

export class RemixVideoDto {
  @IsString()
  videoId: string;

  @IsString()
  prompt: string;
}

