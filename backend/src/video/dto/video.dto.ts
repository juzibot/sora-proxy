import { IsString, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateVideoDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  model?: string = 'sora-2';

  @IsOptional()
  @IsString()
  @IsIn(['720x1280', '1280x720'])
  size?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([4, 8, 12])
  duration?: number;
}

export class RemixVideoDto {
  @IsString()
  videoId: string;

  @IsString()
  prompt: string;
}

