import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

type AzureOpts = { azureEndpoint?: string; azureApiVersion?: string; azureDeployment?: string };

@Injectable()
export class AzureVideoProvider {
  private readonly logger = new Logger(AzureVideoProvider.name);
  private readonly azureApiKey?: string;
  private readonly defaultEndpoint?: string;
  private readonly defaultApiVersion?: string;
  private readonly defaultDeployment?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.azureApiKey = this.configService.get<string>('AZURE_OPENAI_API_KEY');
    this.defaultEndpoint = this.configService.get<string>('AZURE_OPENAI_ENDPOINT');
    this.defaultApiVersion = this.configService.get<string>('AZURE_OPENAI_API_VERSION') || 'preview';
    this.defaultDeployment = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT');
  }

  private buildBase(userApiKey?: string, opts?: AzureOpts) {
    const endpoint = (opts?.azureEndpoint || this.defaultEndpoint || '').replace(/\/$/, '');
    // Video APIs require 'preview' per Azure quickstart; normalize to avoid 400 'API version not supported'
    const requestedVersion = opts?.azureApiVersion || this.defaultApiVersion || 'preview';
    const apiVersion = requestedVersion === 'preview' ? 'preview' : 'preview';
    if (requestedVersion !== apiVersion) {
      this.logger.warn(`Azure video API forcing api-version='preview' (was '${requestedVersion}')`);
    }
    const baseUrl = `${endpoint}/openai`;
    const headers = { 
      'api-key': (userApiKey || this.azureApiKey || ''),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    } as Record<string, string>;
    return { baseUrl, params: { 'api-version': apiVersion }, headers };
  }

  private addFailureReasonIfAny(payload: any): any {
    try {
      if (!payload || typeof payload !== 'object') return payload;
      const clone = JSON.parse(JSON.stringify(payload));
      const failure = (clone && (clone.failure_reason ?? clone.failureReason)) as any;
      const err = (clone && clone.error) as any;
      let message: string | undefined;
      if (failure != null) {
        if (typeof failure === 'string') message = failure;
        else if (typeof failure?.message === 'string') message = failure.message;
        else message = JSON.stringify(failure);
      } else if (err != null) {
        if (typeof err === 'string') message = err;
        else if (typeof err?.message === 'string') message = err.message;
      }
      if (message && !clone.error) {
        clone.error = message;
      }
      return clone;
    } catch {
      return payload;
    }
  }

  async generateVideo(prompt: string, model: string, options?: any, userApiKey?: string, azure?: AzureOpts) {
    if (!prompt?.trim()) {
      throw new Error("'prompt' is required");
    }
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);

    const resolution = options?.size as string | undefined; // WxH
    const seconds = options?.duration ?? options?.seconds;

    const normalizedModel = (() => {
      const m = (model || '').trim();
      if (m) return m; // use as provided
      return 'sora-2';
    })();

    const body: any = {
      prompt,
      model: normalizedModel,
    };
    if (resolution) body.size = resolution;
    if (seconds != null) body.seconds = String(seconds);

    // Per console example: POST {endpoint}/openai/v1/videos
    const primaryUrl = `${baseUrl}/v1/videos`;
    this.logger.debug(`POST ${primaryUrl} | provider=azure | body=${JSON.stringify({ ...body, promptLen: body.prompt?.length })}`);
    try {
      const response = await firstValueFrom(
        this.httpService.post(primaryUrl, body, { headers, proxy: false }),
      );
      return response.data;
    } catch (err: any) {
      throw err;
    }
  }

  async getVideoStatus(videoId: string, userApiKey?: string, azure?: AzureOpts) {
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);
    // Align with videos API
    const primaryUrl = `${baseUrl}/v1/videos/${videoId}`;
    this.logger.debug(`GET ${primaryUrl} | provider=azure`);
    try {
      const response = await firstValueFrom(
        this.httpService.get(primaryUrl, { headers, params, proxy: false }),
      );
      return this.addFailureReasonIfAny(response.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // Fallback to JOB status if ID refers to a job (per Azure quickstart)
        const altUrl = `${baseUrl}/v1/video/generations/jobs/${videoId}`;
        this.logger.warn(`404 on ${primaryUrl}, trying ${altUrl}`);
        const altRes = await firstValueFrom(
          this.httpService.get(altUrl, { headers, params, proxy: false }),
        );
        return this.addFailureReasonIfAny(altRes.data);
      }
      throw err;
    }
  }

  async listVideos(paramsIn?: { limit?: number; after?: string; order?: 'asc' | 'desc' }, userApiKey?: string, azure?: AzureOpts) {
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);
    const mergedParams: Record<string, any> = { ...(params || {}) };
    if (paramsIn?.limit != null) mergedParams['limit'] = paramsIn.limit;
    if (paramsIn?.after) mergedParams['after'] = paramsIn.after;
    if (paramsIn?.order) mergedParams['order'] = paramsIn.order;

    const url = `${baseUrl}/v1/videos`;
    this.logger.debug(`GET ${url} | provider=azure | params=${JSON.stringify(mergedParams)}`);
    const res = await firstValueFrom(
      this.httpService.get(url, { headers, params: mergedParams, proxy: false }),
    );
    const body = res.data;
    if (body && Array.isArray(body.data)) {
      body.data = body.data.map((v: any) => this.addFailureReasonIfAny(v));
    }
    return body;
  }

  async remixVideo(videoId: string, prompt: string, userApiKey?: string, azure?: AzureOpts) {
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);
    const url = `${baseUrl}/v1/videos/${videoId}/remix`;
    const body = { prompt };
    this.logger.debug(`POST ${url} | provider=azure | params=${JSON.stringify(params)} | body=${JSON.stringify({ ...body, promptLen: prompt?.length })}`);
    const res = await firstValueFrom(
      this.httpService.post(url, body, { headers, params, proxy: false }),
    );
    return res.data;
  }

  async downloadVideoContent(videoId: string, userApiKey?: string, azure?: AzureOpts) {
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);

    // Try videos content first for compatibility, then fall back to generations content per docs
    const videosUrl = `${baseUrl}/v1/videos/${videoId}/content`;
    const gensUrl = `${baseUrl}/v1/video/generations/${videoId}/content/video`;
    this.logger.debug(`GET ${videosUrl} | provider=azure | params=${JSON.stringify(params)} | (content primary)`);
    try {
      const res = await firstValueFrom(
        this.httpService.get(videosUrl, { headers, params, responseType: 'stream', proxy: false }),
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status !== 404) throw err;
      this.logger.warn(`404 on ${videosUrl}, trying ${gensUrl}`);
      try {
        const res2 = await firstValueFrom(
          this.httpService.get(gensUrl, { headers, params, responseType: 'stream', proxy: false }),
        );
        return res2.data;
      } catch (err2: any) {
        if (err2?.response?.status !== 404) throw err2;
        // As a final fallback: treat given id as JOB id, resolve generation id via job status
        const jobUrl = `${baseUrl}/v1/video/generations/jobs/${videoId}`;
        this.logger.warn(`404 on ${gensUrl}, trying to resolve generation via ${jobUrl}`);
        const jobRes = await firstValueFrom(
          this.httpService.get(jobUrl, { headers, params, proxy: false }),
        );
        const generations = (jobRes?.data?.generations || []) as Array<{ id?: string }>;
        const genId = generations.find(g => g?.id)?.id;
        if (!genId) {
          throw err2; // No generation id to try
        }
        const finalUrl = `${baseUrl}/v1/video/generations/${genId}/content/video`;
        const res3 = await firstValueFrom(
          this.httpService.get(finalUrl, { headers, params, responseType: 'stream', proxy: false }),
        );
        return res3.data;
      }
    }
  }

  async deleteVideo(videoId: string, userApiKey?: string, azure?: AzureOpts) {
    const { baseUrl, params, headers } = this.buildBase(userApiKey, azure);
    const videosUrl = `${baseUrl}/v1/videos/${videoId}`;
    const gensUrl = `${baseUrl}/v1/video/generations/${videoId}`;
    const jobsUrl = `${baseUrl}/v1/video/generations/jobs/${videoId}`;
    this.logger.debug(`DELETE ${videosUrl} | provider=azure | params=${JSON.stringify(params)}`);
    try {
      const res = await firstValueFrom(
        this.httpService.delete(videosUrl, { headers, params, proxy: false }),
      );
      return res.data;
    } catch (err: any) {
      if (err?.response?.status !== 404) throw err;
      this.logger.warn(`404 on DELETE ${videosUrl}, trying ${gensUrl}`);
      try {
        const res2 = await firstValueFrom(
          this.httpService.delete(gensUrl, { headers, params, proxy: false }),
        );
        return res2.data;
      } catch (err2: any) {
        if (err2?.response?.status !== 404) throw err2;
        this.logger.warn(`404 on DELETE ${gensUrl}, trying ${jobsUrl}`);
        try {
          const res3 = await firstValueFrom(
            this.httpService.delete(jobsUrl, { headers, params, proxy: false }),
          );
          return res3.data;
        } catch (err3: any) {
          if (err3?.response?.status === 404) {
            // Treat as idempotent success if nothing exists
            return {};
          }
          throw err3;
        }
      }
    }
  }
}
