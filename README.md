# Sora Video Studio 🎬

基于 OpenAI Sora 模型的视频生成平台，使用 NestJS + Next.js 构建的全栈应用。

## ✨ 特性

- 🎥 **视频生成**: 通过文字描述生成高质量视频
- ✂️ **视频编辑**: 使用 AI 编辑现有视频
- 🔄 **视频变体**: 创建视频的不同版本
- 📋 **视频管理**: 查看、下载和删除生成的视频
- 🚀 **实时状态**: 实时跟踪视频生成进度
- 🎨 **现代 UI**: 精美的渐变色界面设计
- 🔐 **用户 API Key**: 每个用户使用自己的 OpenAI API Key
- 🔒 **安全隐私**: API Key 仅保存在浏览器本地，不上传服务器

## 🏗️ 技术栈

### 后端
- **NestJS**: 企业级 Node.js 框架
- **TypeScript**: 类型安全
- **Axios**: HTTP 客户端
- **Class Validator**: 请求验证

### 前端
- **Next.js 14**: React 服务端渲染框架
- **React 18**: 用户界面库
- **TypeScript**: 类型安全
- **Tailwind CSS**: 实用优先的 CSS 框架
- **Lucide React**: 精美的图标库
- **React Hot Toast**: 优雅的通知组件

## 📦 项目结构

```
sora-proxy/
├── backend/                 # NestJS 后端服务
│   ├── src/
│   │   ├── main.ts         # 应用入口
│   │   ├── app.module.ts   # 根模块
│   │   └── video/          # 视频模块
│   │       ├── video.controller.ts  # 控制器
│   │       ├── video.service.ts     # 业务逻辑
│   │       ├── openai.service.ts    # OpenAI API 集成
│   │       └── dto/                 # 数据传输对象
│   └── package.json
├── frontend/                # Next.js 前端应用
│   ├── src/
│   │   ├── app/            # App Router
│   │   │   ├── page.tsx    # 主页面
│   │   │   └── layout.tsx  # 布局
│   │   ├── components/     # React 组件
│   │   │   ├── VideoGenerator.tsx  # 视频生成
│   │   │   ├── VideoList.tsx       # 视频列表
│   │   │   └── VideoEditor.tsx     # 视频编辑
│   │   └── lib/
│   │       └── api.ts      # API 客户端
│   └── package.json
├── .env.example            # 环境变量示例
├── .gitignore
├── package.json            # 根 package.json
└── README.md
```

## 🚀 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm 或 yarn
- OpenAI API Key (需要有 Sora 访问权限)

### 安装

1. **克隆项目**

```bash
git clone <repository-url>
cd sora-proxy
```

2. **安装依赖**

```bash
npm run install:all
```

或手动安装：

```bash
# 根目录
npm install

# 后端
cd backend && npm install

# 前端
cd ../frontend && npm install
```

3. **配置环境变量（可选）**

复制 `.env.example` 到 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# OpenAI API Configuration（可选，用户将使用自己的 API Key）
OPENAI_API_KEY=your_openai_api_key_here  # 可选，作为 fallback
OPENAI_API_BASE_URL=https://api.openai.com/v1

# Backend Configuration
BACKEND_PORT=3001
BACKEND_HOST=localhost

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

**重要**: 新版本支持用户自定义 API Key，用户需要在界面上输入自己的 OpenAI API Key。服务器的 `OPENAI_API_KEY` 是可选的，仅作为 fallback 使用。详见 [API Key 使用指南](./API_KEY_GUIDE.md)。

### 运行项目

#### 开发模式

在根目录运行（同时启动前后端）：

```bash
npm run dev
```

或分别启动：

```bash
# 后端 (端口 3001)
npm run dev:backend

# 前端 (端口 3000)
npm run dev:frontend
```

#### 生产模式

```bash
# 构建
npm run build

# 启动
npm run start
```

访问 `http://localhost:3000` 查看应用。

### 首次使用

1. 访问 `http://localhost:3000`
2. 系统会自动跳转到"设置"页面
3. 输入你的 OpenAI API Key（从 [OpenAI Platform](https://platform.openai.com/api-keys) 获取）
4. 点击"保存 API Key"
5. 开始使用视频生成功能

**注意**: API Key 仅保存在你的浏览器本地，不会上传到服务器。详见 [API Key 使用指南](./API_KEY_GUIDE.md)。

## 📖 API 文档

### 视频生成

**POST** `/api/videos/generate`

```json
{
  "prompt": "一只可爱的猫咪在花园里玩耍",
  "model": "sora-1.0-turbo",
  "size": "1080p",
  "quality": "standard",
  "duration": 5
}
```

### 获取视频状态

**GET** `/api/videos/:id`

### 列出所有视频

**GET** `/api/videos?limit=20&after=video_id`

### 删除视频

**DELETE** `/api/videos/:id`

### 上传视频

**POST** `/api/videos/upload`

Content-Type: multipart/form-data

### 创建视频变体

**POST** `/api/videos/variations`

```json
{
  "fileId": "file-xxx",
  "model": "sora-1.0-turbo",
  "size": "1080p",
  "n": 1
}
```

### 编辑视频

**POST** `/api/videos/edit`

```json
{
  "fileId": "file-xxx",
  "prompt": "将背景换成海滩",
  "model": "sora-1.0-turbo",
  "size": "1080p"
}
```

## 🎨 功能说明

### 1. 视频生成
- 输入文字描述
- 选择模型、分辨率、质量和时长
- 实时查看生成状态
- 完成后预览和下载

### 2. 视频列表
- 查看所有生成的视频
- 显示视频状态和缩略图
- 下载或删除视频

### 3. 视频编辑
- 上传现有视频
- 使用文字描述编辑视频
- 或创建视频变体

## 🔧 配置选项

### 视频分辨率
- `1080p` - 全高清
- `720p` - 高清
- `480p` - 标清

### 视频质量
- `standard` - 标准质量
- `hd` - 高清质量

### 模型选项
- `sora-1.0-turbo` - 快速生成
- `sora-1.0` - 标准模型

## 🛠️ 开发

### 后端开发

```bash
cd backend
npm run start:dev  # 启动热重载
```

### 前端开发

```bash
cd frontend
npm run dev  # 启动 Next.js 开发服务器
```

### 代码检查

```bash
# 后端
cd backend && npm run lint

# 前端
cd frontend && npm run lint
```

## 📝 注意事项

1. **用户 API Key**: 用户需要自己提供 OpenAI API Key，保存在浏览器本地
2. **API 密钥安全**: 不要分享你的 API Key，如有泄露请立即在 OpenAI 平台撤销
3. **Sora 访问**: 需要有 OpenAI Sora 模型的访问权限
4. **费用**: 使用 OpenAI API 会产生费用，由使用者自己的账户承担
5. **视频大小**: 上传的视频文件大小有限制
6. **生成时间**: 视频生成可能需要较长时间，请耐心等待
7. **公网部署**: 现在可以安全地部署到公网，因为不需要在服务器上配置 API Key

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [OpenAI API 文档](https://platform.openai.com/docs)
- [NestJS 文档](https://docs.nestjs.com)
- [Next.js 文档](https://nextjs.org/docs)

## 💡 提示

- 生成视频时，提示词越详细，效果越好
- 建议先用较低分辨率测试，确认效果后再用高分辨率
- 定期清理不需要的视频以节省存储空间

---

**Happy Video Generating! 🎬✨**

