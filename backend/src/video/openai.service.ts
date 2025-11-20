import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { AzureVideoProvider } from './providers/azure.video.provider';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly defaultApiKey: string;
  private readonly baseURL: string;
  private readonly azureApiKey?: string;
  private readonly azureEndpoint?: string;
  private readonly azureApiVersion?: string;
  private readonly azureDefaultDeployment?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly azureVideoProvider: AzureVideoProvider,
  ) {
    this.defaultApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.baseURL = this.configService.get<string>('OPENAI_API_BASE_URL') || 'https://api.openai.com/v1';
    this.azureApiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY');
    this.azureEndpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT');
    this.azureApiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION');
    this.azureDefaultDeployment = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT');

    if (!this.defaultApiKey) {
      this.logger.log('OPENAI_API_KEY is not set. Users must provide their own API keys.');
    }
  }

  /**
   * Get API key from user or fallback to default
   */
  private getApiKey(userApiKey?: string): string {
    return userApiKey || this.defaultApiKey;
  }

  private resolveProvider(opts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }): {
    provider: 'openai' | 'azure';
    baseUrl: string;
    headers: Record<string, string>;
    params: Record<string, any>;
    deploymentFallback?: string;
    deploymentHeader?: string;
  } {
    const provider = (opts?.provider === 'azure') ? 'azure' : 'openai';
    if (provider === 'azure') {
      const endpoint = (opts?.azureEndpoint || this.azureEndpoint || '').replace(/\/$/, '');
      const version = opts?.azureApiVersion || this.azureApiVersion || '2024-02-15-preview';
      const apiKey = this.azureApiKey || this.defaultApiKey; // allow passing azure key via x-api-key if desired
      if (!endpoint) {
        this.logger.warn('Azure provider selected but AZURE_OPENAI_ENDPOINT not configured. Falling back may fail.');
      }
      const baseUrl = `${endpoint}/openai`;
      return {
        provider,
        baseUrl,
        headers: { 'api-key': apiKey },
        params: { 'api-version': version },
        deploymentFallback: this.azureDefaultDeployment,
        deploymentHeader: opts?.azureDeployment,
      };
    }
    // openai
    return {
      provider: 'openai',
      baseUrl: this.baseURL,
      headers: { 'Authorization': `Bearer ${this.defaultApiKey}` },
      params: {},
    };
  }

  private mapSizeToResolution(size?: string): string | undefined {
    if (!size) return undefined;
    const normalized = String(size).toLowerCase();
    if (/^\d+x\d+$/.test(normalized)) return normalized;
    const table: Record<string, string> = {
      '1080p': '1920x1080',
      '720p': '1280x720',
      '480p': '854x480',
    };
    return table[normalized];
  }

  private normalizeModel(requested?: string): string {
    const allowed = ['sora-2', 'sora-2-pro'];
    if (requested && allowed.includes(requested)) return requested;
    if (requested && !allowed.includes(requested)) {
      this.logger.warn(`Unsupported model '${requested}', falling back to 'sora-2'`);
    }
    return 'sora-2';
  }

  /**
   * Create a video job (multipart/form-data per Videos API)
   */
  async generateVideo(prompt: string, model = 'sora-2', options?: any, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const trimmedPrompt = (prompt ?? '').toString();
      if (!trimmedPrompt.trim()) {
        throw new Error("'prompt' is required");
      }

      const resolution = this.mapSizeToResolution(options?.size);
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        return await this.azureVideoProvider.generateVideo(
          trimmedPrompt,
          model,
          { size: resolution, duration: options?.duration ?? options?.seconds },
          userApiKey,
          { azureEndpoint: providerOpts?.azureEndpoint, azureApiVersion: providerOpts?.azureApiVersion, azureDeployment: providerOpts?.azureDeployment },
        );
      }
      const resolvedModel = this.normalizeModel(model);
      const candidateSeconds = options?.duration ?? options?.seconds;
      const allowedSeconds = new Set(['4', '8', '12']);
      let normalizedSeconds: string | undefined;
      if (candidateSeconds != null) {
        const asString = String(candidateSeconds);
        if (allowedSeconds.has(asString)) {
          normalizedSeconds = asString;
        } else {
          this.logger.warn(`Unsupported seconds '${asString}', omitting to use API default (4)`);
        }
      }

      // OpenAI JSON create
      {
        const jsonBody: any = {
          model: String(resolvedModel),
          prompt: trimmedPrompt,
        };
        if (normalizedSeconds) jsonBody.seconds = normalizedSeconds;
        if (resolution) jsonBody.size = resolution;

        this.logger.debug(
          `Create video JSON body => model=${jsonBody.model}, promptLen=${trimmedPrompt.length}, seconds=${jsonBody.seconds || 'default'}, size=${jsonBody.size || 'default'}`,
        );

        const url = `${provider.baseUrl}/videos`;
        const headers = {
          ...provider.headers,
          ...(provider.provider === 'openai' ? { 'Authorization': `Bearer ${apiKey}` } : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };
        this.logger.debug(
          `POST ${url} | provider=${provider.provider} | params=${safeStringify(provider.params)} | headers=${safeStringify(redactHeaders(headers))} | bodySummary=${safeStringify({ model: jsonBody.model, promptLen: trimmedPrompt.length, seconds: jsonBody.seconds, size: jsonBody.size })}`,
        );
        const response = await firstValueFrom(
          this.httpService.post(
            url,
            jsonBody,
            {
              headers,
              params: provider.params,
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to generate video: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }

  /**
   * Create a video from image reference (multipart)
   */
  async generateVideoFromImage(image: Express.Multer.File, prompt: string, model = 'sora-2', options?: any, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const trimmedPrompt = (prompt ?? '').toString();
      if (!trimmedPrompt.trim()) {
        throw new Error("'prompt' is required");
      }
      if (!image?.buffer || !image?.mimetype) {
        throw new Error("'image' file is required");
      }
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        return await this.azureVideoProvider.generateVideoFromImage(
          image.buffer,
          image.originalname || 'reference.png',
          image.mimetype,
          trimmedPrompt,
          model,
          { size: this.mapSizeToResolution(options?.size), duration: options?.duration ?? options?.seconds },
          userApiKey,
          { azureEndpoint: providerOpts?.azureEndpoint, azureApiVersion: providerOpts?.azureApiVersion, azureDeployment: providerOpts?.azureDeployment },
        );
      } else {
        // Fallback for OpenAI path: try multipart with 'input_reference'
        const resolvedModel = this.normalizeModel(model);
        const form = new FormData();
        form.append('model', String(resolvedModel));
        form.append('prompt', trimmedPrompt);
        const resolution = this.mapSizeToResolution(options?.size);
        if (resolution) form.append('size', resolution);
        const seconds = options?.duration ?? options?.seconds;
        if (seconds != null) form.append('seconds', String(seconds));
        form.append('input_reference', image.buffer, {
          filename: image.originalname || 'reference.png',
          contentType: image.mimetype,
        } as any);
        const url = `${provider.baseUrl}/videos`;
        const headers = {
          ...provider.headers,
          'Authorization': `Bearer ${apiKey}`,
          ...form.getHeaders(),
        };
        this.logger.debug(`POST ${url} | provider=openai (image)`);
        const response = await firstValueFrom(
          this.httpService.post(url, form, {
            headers,
            params: provider.params,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to generate video from image: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }
  /**
   * Get video generation status
   */
  async getVideoStatus(videoId: string, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        return await this.azureVideoProvider.getVideoStatus(videoId, userApiKey, {
          azureEndpoint: providerOpts?.azureEndpoint,
          azureApiVersion: providerOpts?.azureApiVersion,
        });
      }
      else {
        const url = `${provider.baseUrl}/videos/${videoId}`;
        const headers = {
          ...provider.headers,
          ...(provider.provider === 'openai' ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        } as Record<string, string>;
        this.logger.debug(
          `GET ${url} | provider=openai | params=${safeStringify(provider.params)} | headers=${safeStringify(redactHeaders(headers))}`,
        );
        const response = await firstValueFrom(
          this.httpService.get(
            url,
            {
              headers,
              params: provider.params,
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to get video status: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }

  /**
   * List all videos
   */
  async listVideos(params?: { limit?: number; after?: string; order?: 'asc' | 'desc' }, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        // Use Azure-specific list implementation
        return await this.azureVideoProvider.listVideos(params, userApiKey, {
          azureEndpoint: providerOpts?.azureEndpoint,
          azureApiVersion: providerOpts?.azureApiVersion,
        });
      } else {
        const mergedParams = { ...(provider.params || {}), ...(params || {}) };
        this.logger.debug(
          `GET ${provider.baseUrl}/videos | provider=${provider.provider} | params=${safeStringify(mergedParams)} | headers=${safeStringify(redactHeaders({
            ...provider.headers,
            ...(provider.provider === 'openai' ? { Authorization: `Bearer ${apiKey}` } : {}),
          }))}`,
        );
        const response = await firstValueFrom(
          this.httpService.get(
            `${provider.baseUrl}/videos`,
            {
              headers: {
                ...provider.headers,
                ...(provider.provider === 'openai' ? { 'Authorization': `Bearer ${apiKey}` } : {}),
              },
              params: mergedParams,
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to list videos: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        return await this.azureVideoProvider.deleteVideo(videoId, userApiKey, {
          azureEndpoint: providerOpts?.azureEndpoint,
          azureApiVersion: providerOpts?.azureApiVersion,
        });
      } else {
        this.logger.debug(
          `DELETE ${provider.baseUrl}/videos/${videoId} | provider=${provider.provider} | params=${safeStringify(provider.params)} | headers=${safeStringify(redactHeaders({
            ...provider.headers,
            ...(provider.provider === 'openai' ? { Authorization: `Bearer ${apiKey}` } : {}),
          }))}`,
        );
        const response = await firstValueFrom(
          this.httpService.delete(
            `${provider.baseUrl}/videos/${videoId}`,
            {
              headers: {
                ...provider.headers,
                ...(provider.provider === 'openai' ? { 'Authorization': `Bearer ${apiKey}` } : {}),
              },
              params: provider.params,
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to delete video: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }

  /**
   * Download video content stream
   */
  async downloadVideoContent(videoId: string, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        return await this.azureVideoProvider.downloadVideoContent(videoId, userApiKey, {
          azureEndpoint: providerOpts?.azureEndpoint,
          azureApiVersion: providerOpts?.azureApiVersion,
        });
      } else {
        const url = `${provider.baseUrl}/videos/${videoId}/content`;
        const headers = {
          ...provider.headers,
          ...(provider.provider === 'openai' ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        } as Record<string, string>;
        this.logger.debug(
          `GET ${url} | provider=openai | params=${safeStringify(provider.params)} | headers=${safeStringify(redactHeaders(headers))}`,
        );
        const response = await firstValueFrom(
          this.httpService.get(
            url,
            {
              headers,
              params: provider.params,
              responseType: 'stream',
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to download video content: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }

  /**
   * Remix a completed video with a new prompt
   */
  async remixVideo(videoId: string, prompt: string, userApiKey?: string, providerOpts?: { provider?: 'openai' | 'azure'; azureEndpoint?: string; azureApiVersion?: string }) {
    const apiKey = this.getApiKey(userApiKey);
    try {
      const provider = this.resolveProvider(providerOpts);
      if (provider.provider === 'azure') {
        const response = await this.azureVideoProvider.remixVideo(videoId, prompt, userApiKey, {
          azureEndpoint: providerOpts?.azureEndpoint,
          azureApiVersion: providerOpts?.azureApiVersion,
        });
        return response;
      } else {
        const body = { prompt };
        const url = `${provider.baseUrl}/videos/${videoId}/remix`;
        const headers = {
          ...provider.headers,
          ...(provider.provider === 'openai' ? { Authorization: `Bearer ${apiKey}` } : {}),
          'Content-Type': 'application/json',
        } as Record<string, string>;
        this.logger.debug(
          `POST ${url} | provider=openai | params=${safeStringify(provider.params)} | headers=${safeStringify(redactHeaders(headers))} | body=${safeStringify(body)}`,
        );
        const response = await firstValueFrom(
          this.httpService.post(
            url,
            body,
            {
              headers,
              params: provider.params,
            },
          ),
        );
        return response.data;
      }
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      this.logger.error(
        `Failed to remix video: ${error?.message || 'Unknown'} | status=${status} | payload=${safeStringify(data)}`,
      );
      throw error;
    }
  }
}

function safeStringify(value: any): string {
  try {
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function redactHeaders(headers: Record<string, any>): Record<string, any> {
  const redacted: Record<string, any> = {};
  for (const [k, v] of Object.entries(headers || {})) {
    const key = k.toLowerCase();
    if (key === 'authorization' || key === 'api-key' || key === 'x-api-key') {
      redacted[k] = '[REDACTED]';
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

