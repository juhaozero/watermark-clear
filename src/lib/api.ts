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
  title?: string;
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
  method?: 'GET' | 'POST';
  cookie?: string;
  apiKey?: string;
}

export function getApiBase(): string {
  const base = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
  return base.replace(/\/$/, '');
}

export async function parseVideo(options: ParseOptions): Promise<ApiResponse> {
  const { url, endpoint, method = 'POST', cookie, apiKey } = options;
  const base = getApiBase();
  const target = `${base}${endpoint}`;

  const headers: Record<string, string> = {};
  if (apiKey?.trim()) {
    headers['X-API-Key'] = apiKey.trim();
  }

  let res: Response;
  try {
    if (method === 'GET') {
      const params = new URLSearchParams({ url: url.trim() });
      if (cookie?.trim()) params.set('cookie', cookie.trim());
      res = await fetch(`${target}?${params.toString()}`, {
        method: 'GET',
        headers,
      });
    } else {
      headers['Content-Type'] = 'application/json';
      const body: Record<string, string> = { url: url.trim() };
      if (cookie?.trim()) body.cookie = cookie.trim();
      res = await fetch(target, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    }
  } catch {
    throw new Error('NETWORK');
  }

  let json: ApiResponse;
  try {
    json = (await res.json()) as ApiResponse;
  } catch {
    throw new Error(res.ok ? 'INVALID_JSON' : `HTTP_${res.status}`);
  }

  if (!res.ok && (json.code == null || json.code === 200)) {
    return {
      code: res.status,
      msg: json.msg || `服务返回错误（${res.status}）`,
      data: json.data,
    };
  }

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

export interface FetchedDownload {
  blob: Blob;
  filename: string;
}

export interface ZipDownloadOptions {
  files: DownloadOptions[];
  zipName?: string;
  onProgress?: (done: number, total: number) => void;
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

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120);
  return cleaned || 'download';
}

function uniqueZipEntryName(name: string, used: Set<string>): string {
  let candidate = sanitizeFilename(name);
  if (!used.has(candidate.toLowerCase())) {
    used.add(candidate.toLowerCase());
    return candidate;
  }
  const extMatch = candidate.match(/(\.[a-z0-9]+)$/i);
  const ext = extMatch?.[1] ?? '';
  const stem = ext ? candidate.slice(0, -ext.length) : candidate;
  let i = 2;
  while (used.has(`${stem}_${i}${ext}`.toLowerCase())) i += 1;
  candidate = `${stem}_${i}${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

function saveBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = sanitizeFilename(filename);
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // 部分浏览器立即 revoke 会导致下载中断
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

/** 拉取资源并做 webp→jpg 等处理，不触发保存 */
export async function fetchDownloadBlob(options: DownloadOptions): Promise<FetchedDownload> {
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

  return { blob, filename: sanitizeFilename(name) };
}

async function downloadDirect(options: DownloadOptions): Promise<void> {
  const { blob, filename } = await fetchDownloadBlob(options);
  saveBlob(blob, filename);
}

/** CORS 拦截时降级：新标签页打开资源，用户可右键另存为 */
function openResourceUrl(url: string): void {
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) throw new Error('弹窗被拦截，请允许弹窗后重试');
}

/** 先尝试浏览器直链保存；跨域失败则新标签页打开 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  try {
    await downloadDirect(options);
  } catch (directErr) {
    try {
      openResourceUrl(options.url);
    } catch (openErr) {
      throw openErr instanceof Error
        ? openErr
        : directErr instanceof Error
          ? directErr
          : new Error('下载失败');
    }
  }
}

export interface ZipDownloadResult {
  ok: number;
  failed: number;
}

/** 批量拉取后打成 zip 下载；全部失败则抛错 */
export async function downloadAsZip(options: ZipDownloadOptions): Promise<ZipDownloadResult> {
  const { files, onProgress } = options;
  if (files.length === 0) throw new Error('没有可下载的文件');

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const usedNames = new Set<string>();
  let ok = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const fetched = await fetchDownloadBlob(file);
      const entryName = uniqueZipEntryName(fetched.filename, usedNames);
      zip.file(entryName, fetched.blob);
      ok += 1;
    } catch {
      failed += 1;
    }
    onProgress?.(i + 1, files.length);
  }

  if (ok === 0) throw new Error(failed > 0 ? '全部文件下载失败' : '没有可打包的文件');

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipName = withExtension(options.zipName || 'download', '.zip');
  saveBlob(zipBlob, zipName);

  return { ok, failed };
}
