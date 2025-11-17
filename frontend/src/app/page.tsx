'use client';

import { useState, useEffect } from 'react';
import VideoGenerator from '@/components/VideoGenerator';
import VideoList from '@/components/VideoList';
import VideoEditor from '@/components/VideoEditor';
import ApiKeySettings from '@/components/ApiKeySettings';
import { Video, Sparkles, Film, Settings, AlertCircle } from 'lucide-react';
import { getApiKey } from '@/lib/api';
import { useEffect as ReactUseEffect } from 'react';

type TabType = 'generate' | 'list' | 'edit' | 'settings';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const apiKey = getApiKey();
    setHasApiKey(!!apiKey);
    // 如果没有 API Key，自动跳转到设置页
    if (!apiKey) {
      setActiveTab('settings');
    }
  }, []);

  // 支持子组件触发跳转（例如从列表跳到编辑）
  useEffect(() => {
    const handler = (e: any) => {
      const tab = e?.detail?.tab as TabType | undefined;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('sora:set-tab', handler as any);
    return () => window.removeEventListener('sora:set-tab', handler as any);
  }, []);

  const tabs = [
    { id: 'generate' as TabType, label: '生成视频', icon: Sparkles },
    { id: 'list' as TabType, label: '视频列表', icon: Video },
    { id: 'edit' as TabType, label: '编辑视频', icon: Film },
    { id: 'settings' as TabType, label: '设置', icon: Settings },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Sora Video Studio</h1>
              <p className="text-gray-400 text-sm">基于 OpenAI Sora 的视频生成平台</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex gap-2 bg-black/20 backdrop-blur-sm p-1.5 rounded-xl border border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Key Warning */}
      {!hasApiKey && activeTab !== 'settings' && (
        <div className="max-w-7xl mx-auto px-4 pt-8">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-200 font-semibold">请先设置你的 API Key</p>
                <p className="text-yellow-300/80 text-sm mt-1">
                  你需要输入自己的 OpenAI API Key 才能使用视频生成功能
                </p>
              </div>
              <button
                onClick={() => setActiveTab('settings')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                去设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'generate' && <VideoGenerator />}
        {activeTab === 'list' && <VideoList />}
        {activeTab === 'edit' && <VideoEditor />}
        {activeTab === 'settings' && (
          <ApiKeySettings onApiKeyChange={(hasKey) => setHasApiKey(hasKey)} />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Powered by OpenAI Sora • Built with NestJS & Next.js</p>
        </div>
      </footer>
    </main>
  );
}

