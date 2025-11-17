'use client';

import { useState, useEffect } from 'react';
import { getApiKey, setApiKey, removeApiKey, getProvider, setProvider, getAzureEndpoint, setAzureEndpoint, getAzureVersion, setAzureVersion, getAzureDeployment, setAzureDeployment } from '@/lib/api';
import toast from 'react-hot-toast';
import { Key, Save, Eye, EyeOff, Trash2, AlertCircle } from 'lucide-react';

interface ApiKeySettingsProps {
  onApiKeyChange?: (hasKey: boolean) => void;
}

export default function ApiKeySettings({ onApiKeyChange }: ApiKeySettingsProps) {
  const [apiKey, setApiKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProviderState] = useState<'openai' | 'azure'>(getProvider());
  const [azureEndpoint, setAzureEndpointState] = useState<string>(getAzureEndpoint() || '');
  const [azureVersion, setAzureVersionState] = useState<string>(getAzureVersion() || '2024-02-15-preview');
  const [azureDeployment, setAzureDeploymentState] = useState<string>(getAzureDeployment() || '');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    const storedKey = getApiKey();
    if (storedKey) {
      setApiKeyState(storedKey);
      setHasStoredKey(true);
      onApiKeyChange?.(true);
    } else {
      onApiKeyChange?.(false);
    }
    setProviderState(getProvider());
    setAzureEndpointState(getAzureEndpoint() || '');
    setAzureVersionState(getAzureVersion() || '2024-02-15-preview');
    setAzureDeploymentState(getAzureDeployment() || '');
  }, [onApiKeyChange]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error('请输入 API Key');
      return;
    }
    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      toast.error('OpenAI Key 应以 sk- 开头');
      return;
    }

    if (provider === 'azure') {
      if (!azureEndpoint.trim()) {
        toast.error('请输入 Azure OpenAI Endpoint');
        return;
      }
      if (!azureVersion.trim()) {
        toast.error('请输入 Azure API Version');
        return;
      }
      setAzureEndpoint(azureEndpoint.trim());
      setAzureVersion(azureVersion.trim());
      if (!azureDeployment.trim()) {
        toast.error('请输入 Azure 部署名称（模型名）');
        return;
      }
      setAzureDeployment(azureDeployment.trim());
    }

    setProvider(provider);
    setApiKey(apiKey);
    setHasStoredKey(true);
    toast.success('API Key 已保存！');
    onApiKeyChange?.(true);
  };

  const handleRemove = () => {
    if (confirm('确定要删除保存的 API Key 吗？')) {
      removeApiKey();
      setApiKeyState('');
      setHasStoredKey(false);
      toast.success('API Key 已删除');
      onApiKeyChange?.(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">API Key 设置</h2>
          <p className="text-sm text-gray-400">支持 OpenAI 或 Azure OpenAI</p>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-semibold mb-1">安全提示：</p>
            <ul className="space-y-1 text-yellow-300/80">
              <li>• API Key 仅保存在你的浏览器本地存储中</li>
              <li>• 不会上传到服务器或与他人共享</li>
              <li>• 请妥善保管你的 API Key，不要泄露给他人</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Provider & API Key */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">服务提供方</label>
        <select
          value={provider}
          onChange={(e) => setProviderState(e.target.value as any)}
          className="w-full px-3 py-2 bg-black/30 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="openai">OpenAI</option>
          <option value="azure">Azure OpenAI</option>
        </select>

        <label className="block text-sm font-medium text-gray-300">
          你的 API Key {hasStoredKey && <span className="text-green-400">✓ 已保存</span>}
        </label>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'Azure Key（不以 sk- 开头）'}
              className="w-full px-4 py-3 pr-12 bg-black/30 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              type="button"
            >
              {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {provider === 'azure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">Azure Endpoint</label>
              <input
                type="text"
                value={azureEndpoint}
                onChange={(e) => setAzureEndpointState(e.target.value)}
                placeholder="https://<resource>.openai.azure.com"
                className="w-full px-4 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">API Version</label>
              <input
                type="text"
                value={azureVersion}
                onChange={(e) => setAzureVersionState(e.target.value)}
                placeholder="2024-02-15-preview"
                className="w-full px-4 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300">Deployment（模型名）</label>
              <input
                type="text"
                value={azureDeployment}
                onChange={(e) => setAzureDeploymentState(e.target.value)}
                placeholder="例如：sora-2（或你的自定义部署名）"
                className="w-full px-4 py-2 bg-black/30 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-green-500/30"
          >
            <Save className="w-4 h-4" />
            保存 API Key
          </button>

          {hasStoredKey && (
            <button
              onClick={handleRemove}
              className="flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium py-3 px-4 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">
          OpenAI Key：{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">获取</a>
          {' '}｜ Azure OpenAI：{' '}
          <a href="https://learn.microsoft.com/azure/ai-services/openai/overview" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">文档</a>
        </p>
      </div>
    </div>
  );
}

