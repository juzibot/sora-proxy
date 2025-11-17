'use client';

import { useEffect, useState } from 'react';
import { videoAPI, VideoResponse, getSelectedVideoId } from '@/lib/api';
import toast from 'react-hot-toast';
import { Wand2, Loader2 } from 'lucide-react';

export default function VideoEditor() {
  const [videoId, setVideoId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VideoResponse | null>(null);

  useEffect(() => {
    const preset = getSelectedVideoId();
    if (preset) setVideoId(preset);
  }, []);

  const handleRemix = async () => {
    if (!videoId.trim()) {
      toast.error('请输入已完成的视频 ID');
      return;
    }
    if (!prompt.trim()) {
      toast.error('请输入用于 Remix 的提示词');
      return;
    }
    setProcessing(true);
    setResult(null);
    try {
      const response = await videoAPI.remixVideo(videoId.trim(), prompt.trim());
      setResult(response);
      toast.success('视频 Remix 任务已提交！');
    } catch (error: any) {
      console.error('Error remixing video:', error);
      toast.error(error.response?.data?.message || 'Remix 失败');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">视频 Remix</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">源视频 ID</label>
            <input
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="例如：video_123"
              className="w-full px-4 py-3 bg-black/30 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={processing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Remix 提示词</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述希望对现有视频做的变化，例如：延长场景，添加尾声..."
              className="w-full px-4 py-3 bg-black/30 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={processing}
            />
          </div>

          <button
            onClick={handleRemix}
            disabled={processing || !videoId.trim() || !prompt.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                提交 Remix
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">处理结果</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">任务 ID</p>
              <p className="text-white font-mono text-sm">{result.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">状态</p>
              <p className="text-white">{result.status}</p>
            </div>
            {result.status === 'processing' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  视频处理中，请稍候...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

