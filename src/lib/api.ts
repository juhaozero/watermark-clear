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
  cookie?: string;
  referer?: string;
}

/** 走服务端代理下载的最大文件体积（字节），0 表示始终本地下载 */
export function getDownloadServerMaxBytes(): number {
  const raw = import.meta.env.PUBLIC_DOWNLOAD_SERVER_MAX_MB;
  if (raw === undefined || raw === '') return 50 * 1024 * 1024;
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb < 0) return 50 * 1024 * 1024;
  return Math.floor(mb * 1024 * 1024);
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

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1]);
  const basic = /filename="([^"]+)"/i.exec(header) ?? /filename=([^;\s]+)/i.exec(header);
  return basic ? basic[1] : null;
}

function parseContentLength(header: string | null): number | null {
  if (!header) return null;
  const size = Number(header);
  return Number.isFinite(size) && size >= 0 ? size : null;
}

function buildDownloadQuery(options: DownloadOptions): URLSearchParams {
  const { url, filename, cookie, referer } = options;
  const params = new URLSearchParams({ url });
  if (filename?.trim()) params.set('filename', filename.trim());
  if (cookie?.trim()) params.set('cookie', cookie.trim());
  if (referer?.trim()) params.set('referer', referer.trim());
  return params;
}

async function probeFileSizeViaServer(options: DownloadOptions): Promise<number | null> {
  const params = buildDownloadQuery(options);
  try {
    const res = await fetch(`${getApiBase()}/api/download?${params}`, { method: 'HEAD' });
    if (!res.ok) return null;
    return parseContentLength(res.headers.get('Content-Length'));
  } catch {
    return null;
  }
}

async function probeFileSizeDirect(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD', referrerPolicy: 'no-referrer' });
    if (!res.ok) return null;
    return parseContentLength(res.headers.get('Content-Length'));
  } catch {
    return null;
  }
}

async function resolveFileSize(options: DownloadOptions): Promise<number | null> {
  return (await probeFileSizeViaServer(options)) ?? (await probeFileSizeDirect(options.url));
}

async function downloadFileViaServer(options: DownloadOptions): Promise<void> {
  const params = buildDownloadQuery(options);
  const res = await fetch(`${getApiBase()}/api/download?${params}`);
  if (!res.ok) throw new Error('下载失败');

  const blob = await res.blob();
  const name =
    parseFilenameFromDisposition(res.headers.get('Content-Disposition')) ??
    options.filename?.trim() ??
    'download';
  saveBlob(blob, name);
}

function triggerAnchorDownload(url: string, filename: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function downloadFileLocally(url: string, filename?: string): Promise<void> {
  const name = buildLocalFilename(filename, url);
  // 大文件走本地下载：用动态 <a> 交给浏览器原生下载，避免 fetch 整文件进内存
  triggerAnchorDownload(url, name);
}

export async function downloadFile(options: DownloadOptions): Promise<void> {
  const maxBytes = getDownloadServerMaxBytes();

  if (maxBytes === 0) {
    await downloadFileLocally(options.url, options.filename);
    return;
  }

  const size = await resolveFileSize(options);

  if (size == null || size > maxBytes) {
    await downloadFileLocally(options.url, options.filename);
    return;
  }

  await downloadFileViaServer(options);
}
