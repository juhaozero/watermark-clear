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
    const res = await fetch(`${getApiBase()}/health`, { method: 'GET' });
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

function guessExtension(url: string): string {
  try {
    const match = new URL(url).pathname.match(/\.([a-z0-9]+)$/i);
    if (match) return `.${match[1].toLowerCase()}`;
  } catch {
    /* invalid url */
  }
  return '.mp4';
}

function buildLocalFilename(filename: string | undefined, url: string): string {
  const base = filename?.trim() || 'download';
  if (/\.[a-z0-9]+$/i.test(base)) return base;
  return `${base}${guessExtension(url)}`;
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
  const name = buildLocalFilename(options.filename, options.url);
  const res = await fetch(options.url, { referrerPolicy: 'no-referrer' });
  if (!res.ok) throw new Error('直链下载失败');
  saveBlob(await res.blob(), name);
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
