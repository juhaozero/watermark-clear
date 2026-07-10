# Watermark Clear Web

基于 [Astro](https://astro.build) + [Tailwind CSS](https://tailwindcss.com) + [React](https://react.dev) 的去水印前端页面，对接后端解析 API。

## 技术栈

| 技术 | 用途 |
|------|------|
| Astro | 静态站点生成（SSG） |
| Tailwind CSS | 样式与响应式布局 |
| React | 交互组件（平台筛选、表单、主题切换） |
| TypeScript | 类型安全 |

## 快速开始

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

开发服务器默认运行在 `http://localhost:4321`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PUBLIC_API_BASE_URL` | `http://localhost:8080` | 后端 API 地址 |
| `BASE_PATH` | `/` | 部署子路径，如 `/watermark/` |

## 构建

```bash
npm run build
npm run preview
```

构建产物在 `dist/` 目录，可部署到任意静态托管服务。

## 功能

- 平台筛选（自动识别 / 抖音 / 快手 / 小红书 / B 站 / 微博 / 豆包）
- 链接粘贴与解析
- 高级选项：Cookie、API Key
- 解析结果展示：封面、作者、下载、分 P、图集、背景音乐
- 浅色 / 深色主题切换
- API 健康状态检测

## 项目结构

```
web/
├── src/
│   ├── components/     # React 交互组件
│   ├── layouts/        # Astro 布局
│   ├── lib/            # API 客户端与类型
│   ├── pages/          # 页面
│   └── styles/         # 全局样式
├── public/
└── astro.config.mjs
```
