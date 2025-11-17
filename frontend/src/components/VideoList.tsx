'use client';

import { useState, useEffect } from 'react';
import { videoAPI, StoredVideo, getStoredVideos, mergeRemoteIntoStored, removeStoredVideo, selectVideoForEditing, getProvider } from '@/lib/api';
import toast from 'react-hot-toast';
import { RefreshCw, Trash2, Download, Loader2, Copy, Edit3, XCircle } from 'lucide-react';
import HoverTooltip from './HoverTooltip';

export default function VideoList() {
  const [videos, setVideos] = useState<StoredVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const currentProvider = getProvider();

  const getFailureReason = (video: any): string | undefined => {
    const err = video?.error ?? video?.failure_reason ?? video?.failureReason ?? video?.details?.error;
    if (!err) return undefined;
    if (typeof err === 'string') return err;
    if (typeof err?.message === 'string') return err.message;
    try { return JSON.stringify(err); } catch { return String(err); }
  };

  const loadVideos = async () => {
    setLoading(true);
    try {
      // Load local history first for instant UI
      setVideos(getStoredVideos());
      // Then fetch remote and merge into local history
      const response = await videoAPI.listVideos(20);
      const merged = mergeRemoteIntoStored(response.data || []);
      setVideos(merged);
    } catch (error: any) {
      console.error('Error loading videos:', error);
      toast.error('加载视频列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (video: StoredVideo) => {
    setDownloading(video.id);
    try {
      const blob = await videoAPI.downloadVideoBlob(video.id, video.providerMeta);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('Download failed:', e);
      toast.error('下载失败');
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleDelete = async (videoId: string) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    setDeleting(videoId);
    try {
      await videoAPI.deleteVideo(videoId);
      toast.success('视频已删除');
      removeStoredVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (error: any) {
      console.error('Error deleting video:', error);
      toast.error('删除视频失败');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string, error?: any) => {
    const badges = {
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      queued: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const text = {
      completed: '已完成',
      processing: '处理中',
      queued: '排队中',
      failed: '失败',
    };
    const tooltip = (() => {
      if (status !== 'failed' || !error) return undefined;
      if (typeof error === 'string') return error;
      if (typeof error?.message === 'string') return error.message;
      try { return JSON.stringify(error); } catch { return String(error); }
    })();
    if (status === 'failed') {
      const badge = (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${badges[status as keyof typeof badges]}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          {text[status as keyof typeof text] || status}
        </span>
      );
      return tooltip ? <HoverTooltip content={tooltip}>{badge}</HoverTooltip> : badge;
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges] || 'bg-gray-500/20 text-gray-400'}`}>
        {text[status as keyof typeof text] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">视频列表</h2>
        <button
          onClick={loadVideos}
          disabled={loading}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {/* Video Grid */}
      {loading && videos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-12 text-center">
          <p className="text-gray-400 text-lg">暂无视频</p>
          <p className="text-gray-500 text-sm mt-2">去生成你的第一个视频吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors"
            >
              {/* Video Preview */}
              <div className="aspect-video bg-black/50 flex items-center justify-center">
                {video.status === 'completed' ? (
                  <video
                    src={videoAPI.getVideoContentUrlFor(video.id, video.providerMeta)}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500">
                    {video.status === 'processing' && <Loader2 className="w-8 h-8 animate-spin" />}
                    {video.status === 'queued' && <span>排队中...</span>}
                    {video.status === 'failed' && <span>生成失败</span>}
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {video.prompt && (
                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                        {video.prompt}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 font-mono truncate">
                        ID: {video.id}
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(video.id);
                            toast.success('已复制视频 ID');
                          } catch {
                            toast.error('复制失败');
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                        title="复制视频ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {getStatusBadge(video.status, getFailureReason(video))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {video.status === 'completed' && (
                    <button
                      onClick={() => handleDownload(video)}
                      disabled={downloading === video.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {downloading === video.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      下载
                    </button>
                  )}
                  {(video.status !== 'failed') && (
                    <button
                      onClick={() => selectVideoForEditing(video.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      编辑
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(video.id)}
                    disabled={deleting === video.id}
                    className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === video.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

