'use client';

import { useEffect, useState } from 'react';
import { videoAPI, GenerateVideoParams, VideoResponse, getProvider, getAzureEndpoint, getAzureVersion, getAzureDeployment, upsertStoredVideo, ProviderMeta } from '@/lib/api';
import toast from 'react-hot-toast';
import { Sparkles, Loader2, Download } from 'lucide-react';

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResponse | null>(null);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  const [options, setOptions] = useState<Partial<GenerateVideoParams>>({
    model: 'sora-2',
    size: '720x1280',
    duration: 4,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (provider === 'azure') {
      const dep = getAzureDeployment();
      if (dep) setOptions((prev) => ({ ...prev, model: dep }));
    }
  }, []);

  // Stop any ongoing polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  const stringifyError = (err: any): string => {
    if (err == null) return '';
    if (typeof err === 'string') return err;
    if (typeof err?.message === 'string') return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    try {
      const result = await videoAPI.getVideoStatus(videoId);
      setVideoResult(result);
      // Persist latest status to local history
      const meta: ProviderMeta = {
        provider: getProvider(),
        azureEndpoint: getAzureEndpoint(),
        azureVersion: getAzureVersion(),
        azureDeployment: getAzureDeployment(),
      };
      upsertStoredVideo(result, meta);

      if (result.status === 'completed') {
        toast.success('视频生成完成！');
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        setLoading(false);
      } else if (result.status === 'failed') {
        toast.error('视频生成失败：' + (result.error || '未知错误'));
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error polling video status:', error);
      const status = error?.response?.status;
      if (status === 404) {
        // Video deleted on server; stop polling and remove locally
        try {
          const { removeStoredVideo } = await import('@/lib/api');
          removeStoredVideo(videoId);
        } catch {}
        toast.error('视频已被删除');
      } else {
        toast.error('获取视频状态失败');
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('请输入视频描述');
      return;
    }

    // Clear previous polling timer if any
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    setLoading(true);
    setVideoResult(null);

    try {
      const result = imageFile
        ? await videoAPI.generateVideoFromImage({
            prompt,
            image: imageFile,
            ...options,
          } as any)
        : await videoAPI.generateVideo({
            prompt,
            ...options,
          });

      setVideoResult(result);
      // Save to local history immediately
      const meta: ProviderMeta = {
        provider: getProvider(),
        azureEndpoint: getAzureEndpoint(),
        azureVersion: getAzureVersion(),
        azureDeployment: getAzureDeployment(),
      };
      upsertStoredVideo({ ...result, prompt }, meta);
      toast.success('视频生成任务已提交！');

      // Start polling for status
      const interval = setInterval(() => {
        pollVideoStatus(result.id);
      }, 3000);
      setPollInterval(interval);
    } catch (error: any) {
      console.error('Error generating video:', error);
      toast.error(error.response?.data?.message || '生成视频失败');
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400';
      case 'processing':
        return 'text-blue-400';
      case 'queued':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '处理中';
      case 'queued':
        return '排队中';
      case 'failed':
        return '失败';
      default:
        return '未知';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">生成新视频</h2>

        <div className="space-y-4">
          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              视频描述
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想生成的视频内容，例如：一只可爱的猫咪在花园里玩耍..."
              className="w-full px-4 py-3 bg-black/30 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                模型
              </label>
              <select
                value={options.model}
                onChange={(e) => setOptions({ ...options, model: e.target.value })}
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="sora-2">sora-2</option>
              </select>
            </div>

            {/* Size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                分辨率
              </label>
              <select
                value={options.size}
                onChange={(e) => setOptions({ ...options, size: e.target.value as any })}
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="720x1280">720x1280（竖屏）</option>
                <option value="1280x720">1280x720（横屏）</option>
              </select>
            </div>

            {/* Image Reference */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                参考图片（可选）
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                disabled={loading}
                className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
            </div>

            {/* Seconds */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                时长 (秒)
              </label>
              <select
                value={options.duration}
                onChange={(e) => setOptions({ ...options, duration: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value={4}>4</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                生成视频
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Section */}
      {videoResult && (
        <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">生成结果</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">状态</p>
                <p className={`text-lg font-semibold ${getStatusColor(videoResult.status)}`}>
                  {getStatusText(videoResult.status)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">视频 ID</p>
                <p className="text-sm text-white font-mono">{videoResult.id}</p>
              </div>
            </div>

            {videoResult.prompt && (
              <div>
                <p className="text-sm text-gray-400 mb-1">提示词</p>
                <p className="text-white bg-black/30 p-3 rounded-lg">{videoResult.prompt}</p>
              </div>
            )}

            {videoResult.status === 'completed' && (
              <div className="space-y-3">
                <video
                  src={videoAPI.getVideoContentUrlFor(videoResult.id, {
                    provider: getProvider(),
                    azureEndpoint: getAzureEndpoint(),
                    azureVersion: getAzureVersion(),
                    azureDeployment: getAzureDeployment(),
                  })}
                  controls
                  className="w-full rounded-xl border border-gray-600"
                />
                <button
                  onClick={async () => {
                    try {
                      const blob = await videoAPI.downloadVideoBlob(videoResult.id, {
                        provider: getProvider(),
                        azureEndpoint: getAzureEndpoint(),
                        azureVersion: getAzureVersion(),
                        azureDeployment: getAzureDeployment(),
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `video-${videoResult.id}.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      toast.error('下载失败');
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  下载视频
                </button>
                <button
                  onClick={() => {
                    setVideoResult(null);
                    setPrompt('');
                  }}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors ml-2"
                >
                  再次生成
                </button>
              </div>
            )}

            {videoResult.status === 'failed' && videoResult.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400">{stringifyError(videoResult.error as any)}</p>
              </div>
            )}
            {videoResult.status === 'failed' && (
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  重试生成
                </button>
                <button
                  onClick={() => setVideoResult(null)}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  修改参数
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

