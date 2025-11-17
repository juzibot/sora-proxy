import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Storage keys
const API_KEY_STORAGE_KEY = 'sora_api_key';
const PROVIDER_STORAGE_KEY = 'sora_provider'; // 'openai' | 'azure'
const AZURE_ENDPOINT_STORAGE_KEY = 'sora_azure_endpoint';
const AZURE_VERSION_STORAGE_KEY = 'sora_azure_version';
const AZURE_DEPLOYMENT_STORAGE_KEY = 'sora_azure_deployment';
const VIDEO_HISTORY_STORAGE_KEY = 'sora_video_history';
const SELECTED_VIDEO_ID_STORAGE_KEY = 'sora_selected_video_id';

// Getters/Setters
export const getApiKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const setApiKey = (apiKey: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
};

export const removeApiKey = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

export const getProvider = (): 'openai' | 'azure' => {
  if (typeof window === 'undefined') return 'openai';
  return (localStorage.getItem(PROVIDER_STORAGE_KEY) as any) || 'openai';
};

export const setProvider = (provider: 'openai' | 'azure'): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
};

export const getAzureEndpoint = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AZURE_ENDPOINT_STORAGE_KEY) || process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT || null;
};

export const setAzureEndpoint = (endpoint: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AZURE_ENDPOINT_STORAGE_KEY, endpoint);
};

export const getAzureVersion = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AZURE_VERSION_STORAGE_KEY) || process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION || null;
};

export const setAzureVersion = (version: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AZURE_VERSION_STORAGE_KEY, version);
};

export const getAzureDeployment = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AZURE_DEPLOYMENT_STORAGE_KEY) || process.env.NEXT_PUBLIC_AZURE_OPENAI_DEPLOYMENT || null;
};

export const setAzureDeployment = (deployment: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AZURE_DEPLOYMENT_STORAGE_KEY, deployment);
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add API Key and provider headers
api.interceptors.request.use(
  (config) => {
    const apiKey = getApiKey();
    if (apiKey) {
      config.headers['x-api-key'] = apiKey;
    }
    const provider = getProvider();
    config.headers['x-provider'] = provider;
    if (provider === 'azure') {
      const endpoint = getAzureEndpoint();
      const version = getAzureVersion();
      const deployment = getAzureDeployment();
      if (endpoint) config.headers['x-azure-endpoint'] = endpoint;
      if (version) config.headers['x-azure-version'] = version;
      if (deployment) config.headers['x-azure-deployment'] = deployment;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface GenerateVideoParams {
  prompt: string;
  model?: string;
  size?: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
  duration?: number;
}

export interface VideoResponse {
  id: string;
  object: string;
  created: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  prompt?: string;
  url?: string;
  error?: string;
}

export interface ProviderMeta {
  provider: 'openai' | 'azure';
  azureEndpoint?: string | null;
  azureVersion?: string | null;
  azureDeployment?: string | null;
}

export interface StoredVideo extends VideoResponse {
  providerMeta?: ProviderMeta;
}

// -------- Local history helpers --------
const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const getStoredVideos = (): StoredVideo[] => {
  if (typeof window === 'undefined') return [];
  const list = safeParse<StoredVideo[]>(localStorage.getItem(VIDEO_HISTORY_STORAGE_KEY));
  return Array.isArray(list) ? list : [];
};

const setStoredVideos = (videos: StoredVideo[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VIDEO_HISTORY_STORAGE_KEY, JSON.stringify(videos));
};

export const upsertStoredVideo = (video: VideoResponse, meta?: ProviderMeta) => {
  const current = getStoredVideos();
  const idx = current.findIndex((v) => v.id === video.id);
  const merged: StoredVideo = {
    ...(idx >= 0 ? current[idx] : ({} as StoredVideo)),
    ...video,
    providerMeta: meta ?? (idx >= 0 ? current[idx].providerMeta : undefined),
  };
  if (idx >= 0) {
    current[idx] = merged;
  } else {
    current.unshift(merged);
  }
  setStoredVideos(current);
};

export const removeStoredVideo = (videoId: string) => {
  const current = getStoredVideos().filter((v) => v.id !== videoId);
  setStoredVideos(current);
};

export const mergeRemoteIntoStored = (remote: VideoResponse[]): StoredVideo[] => {
  const byId: Record<string, StoredVideo> = {};
  for (const v of getStoredVideos()) {
    byId[v.id] = v;
  }
  for (const r of remote || []) {
    const existing = byId[r.id];
    if (existing) {
      byId[r.id] = { ...existing, ...r, providerMeta: existing.providerMeta };
    } else {
      byId[r.id] = { ...r };
    }
  }
  const result = Object.values(byId).sort((a, b) => (b.created || 0) - (a.created || 0));
  setStoredVideos(result);
  return result;
};

// -------- Navigation helpers --------
export const selectVideoForEditing = (videoId: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELECTED_VIDEO_ID_STORAGE_KEY, videoId);
    window.dispatchEvent(new CustomEvent('sora:set-tab', { detail: { tab: 'edit' } }));
  } catch {
    // noop
  }
};

export const getSelectedVideoId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SELECTED_VIDEO_ID_STORAGE_KEY);
};

// -------- URL builders --------
export const videoAPI = {
  // Generate a new video
  generateVideo: async (params: GenerateVideoParams): Promise<VideoResponse> => {
    const response = await api.post('/api/videos/generate', params);
    return response.data;
  },

  // Get video status
  getVideoStatus: async (videoId: string): Promise<VideoResponse> => {
    const response = await api.get(`/api/videos/${videoId}`);
    return response.data;
  },

  // List all videos
  listVideos: async (limit?: number, after?: string): Promise<{ data: VideoResponse[] }> => {
    const response = await api.get('/api/videos', {
      params: { limit, after },
    });
    return response.data;
  },

  // Delete a video
  deleteVideo: async (videoId: string): Promise<void> => {
    await api.delete(`/api/videos/${videoId}`);
  },

  // Remix a completed video with a new prompt
  remixVideo: async (videoId: string, prompt: string): Promise<VideoResponse> => {
    const response = await api.post('/api/videos/remix', { videoId, prompt });
    return response.data;
  },

  // Build a proxied content URL for a completed video
  getVideoContentUrl: (videoId: string): string => {
    const base = `${API_URL}/api/videos/${videoId}/content`;
    const provider = getProvider();
    const params = new URLSearchParams();
    const apiKey = getApiKey();
    if (apiKey) params.set('apiKey', apiKey);
    if (provider === 'azure') {
      const endpoint = getAzureEndpoint();
      const version = getAzureVersion();
      const deployment = getAzureDeployment();
      params.set('provider', 'azure');
      if (endpoint) params.set('azureEndpoint', endpoint);
      if (version) params.set('azureVersion', version);
      if (deployment) params.set('azureDeployment', deployment);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },

  // Build content URL using explicit per-video provider meta
  getVideoContentUrlFor: (videoId: string, meta?: ProviderMeta): string => {
    const base = `${API_URL}/api/videos/${videoId}/content`;
    const params = new URLSearchParams();
    const apiKey = getApiKey();
    if (apiKey) params.set('apiKey', apiKey);
    // Fallback: if no meta provided, use current provider settings
    const effectiveMeta: ProviderMeta | undefined = (() => {
      if (meta) return meta;
      const current = getProvider();
      if (current === 'azure') {
        return {
          provider: 'azure',
          azureEndpoint: getAzureEndpoint(),
          azureVersion: getAzureVersion(),
          azureDeployment: getAzureDeployment(),
        };
      }
      return undefined;
    })();
    if (effectiveMeta && effectiveMeta.provider === 'azure') {
      params.set('provider', 'azure');
      if (effectiveMeta.azureEndpoint) params.set('azureEndpoint', effectiveMeta.azureEndpoint);
      if (effectiveMeta.azureVersion) params.set('azureVersion', effectiveMeta.azureVersion);
      if (effectiveMeta.azureDeployment) params.set('azureDeployment', effectiveMeta.azureDeployment);
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },

  // Programmatic download: fetch blob and return it (caller handles save)
  downloadVideoBlob: async (videoId: string, meta?: ProviderMeta): Promise<Blob> => {
    const url = videoAPI.getVideoContentUrlFor(videoId, meta);
    const res = await fetch(url, {
      method: 'GET',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `下载失败（HTTP ${res.status}）`);
    }
    return await res.blob();
  },
};

