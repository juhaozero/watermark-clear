export interface Author {
  name: string;
  id?: string;
  avatar?: string;
}

export interface VideoBackup {
  url: string;
  label?: string;
  quality?: string;
}

export interface Music {
  title?: string;
  author?: string;
  url?: string;
  cover?: string;
}

export interface Stats {
  like_count?: number;
  play_count?: number;
}

export interface VideoPart {
  title?: string;
  url?: string;
  cover?: string;
  duration?: string;
}

export interface VideoData {
  platform: string;
  type: string;
  title: string;
  desc?: string;
  author?: Author;
  cover?: string;
  url?: string;
  video_backup?: VideoBackup[];
  video_id?: string;
  images?: string[];
  live_photo?: string[];
  music?: Music;
  parts?: VideoPart[];
  stats?: Stats;
}

export interface ApiResponse {
  code: number;
  msg: string;
  data?: VideoData;
}

export interface ParseOptions {
  url: string;
  endpoint: string;
  cookie?: string;
  apiKey?: string;
}

export function getApiBase(): string {
  const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
  return base.replace(/\/$/, '');
}

export async function parseVideo(options: ParseOptions): Promise<ApiResponse> {
  const { url, endpoint, cookie, apiKey } = options;
  const base = getApiBase();
  const target = `${base}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey?.trim()) {
    headers['X-API-Key'] = apiKey.trim();
  }

  const body: Record<string, string> = { url: url.trim() };
  if (cookie?.trim()) {
    body.cookie = cookie.trim();
  }

  const res = await fetch(target, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as ApiResponse;
  return json;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const path = import.meta.env.PUBLIC_HEALTH_PATH ?? '/health';
    const res = await fetch(`${getApiBase()}${path}`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatCount(n?: number): string {
  if (n == null) return '—';
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString('zh-CN');
}

export interface DownloadOptions {
  url: string;
  filename?: string;
}

function guessExtension(url: string, fallback = '.mp4'): string {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    if (match) return `.${match[1].toLowerCase()}`;
  } catch {
    /* invalid url */
  }
  return fallback;
}

function extensionFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
  };
  return map[mime] ?? null;
}

function stripExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '');
}

function withExtension(filename: string | undefined, ext: string): string {
  const base = stripExtension(filename?.trim() || 'download') || 'download';
  return `${base}${ext.startsWith('.') ? ext : `.${ext}`}`;
}

function buildLocalFilename(
  filename: string | undefined,
  url: string,
  contentType?: string | null,
): string {
  const base = filename?.trim() || 'download';
  if (/\.[a-z0-9]+$/i.test(base)) return base;
  const fromType = extensionFromContentType(contentType ?? null);
  return `${base}${fromType ?? guessExtension(url)}`;
}

function isWebpLike(blob: Blob, url: string, contentType: string | null): boolean {
  const mime = (contentType || blob.type || '').split(';')[0].trim().toLowerCase();
  if (mime === 'image/webp' || mime === 'image/avif') return true;
  const ext = guessExtension(url, '').toLowerCase();
  return ext === '.webp' || ext === '.avif';
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片解码失败'));
    };
    img.src = objectUrl;
  });
}

/** 将 webp/avif 转为 JPEG，便于本地查看与分享；失败则回退原图 */
async function convertToJpeg(blob: Blob, quality = 0.92): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');
  // webp 透明区域铺白底，避免转 jpg 后发黑
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const jpeg = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
  if (!jpeg) throw new Error('JPEG 编码失败');
  return jpeg;
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

async function downloadDirect(options: DownloadOptions): Promise<void> {
  const res = await fetch(options.url, { referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('直链下载失败');
  let blob = await res.blob();
  const contentType = res.headers.get('content-type') || blob.type;
  let name = buildLocalFilename(options.filename, options.url, contentType);

  // 抖音等平台图集多为 webp，下载时统一转成 jpg
  if (isWebpLike(blob, options.url, contentType)) {
    try {
      blob = await convertToJpeg(blob);
      name = withExtension(options.filename || name, '.jpg');
    } catch {
      /* 转换失败则保留原 webp */
    }
  }

  saveBlob(blob, name);
}

/** CORS 拦截时降级：新标签页打开视频，用户可右键另存为 */
function openVideoUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** 先尝试浏览器直链保存；跨域失败则新标签页打开视频 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  try {
    await downloadDirect(options);
  } catch {
    openVideoUrl(options.url);
  }
}
