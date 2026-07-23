import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  type ApiResponse,
  type DownloadOptions,
  type VideoData,
  checkHealth,
  downloadAsZip,
  downloadFile,
  formatCount,
  getApiBase,
  parseVideo,
} from '../lib/api';
import { PLATFORMS, CONTENT_PLATFORMS, PLATFORM_LABELS, type PlatformId } from '../lib/platforms';
import { detectPlatformFromUrl, extractVideoUrl } from '../lib/url';
import PlatformIcon from './PlatformIcon';

function applyPastedShareText(
  text: string,
  platform: PlatformId,
  setUrl: (url: string) => void,
  setPlatform: (id: PlatformId) => void,
) {
  const extracted = extractVideoUrl(text, platform);
  if (!extracted) {
    setUrl(text.trim());
    return;
  }
  setUrl(extracted);
  // 自动识别模式下保持选中，不强制切换到具体平台
  if (platform === 'auto') return;
  const detected = detectPlatformFromUrl(extracted);
  if (detected) setPlatform(detected);
}

function platformLabel(id: string): string {
  return PLATFORM_LABELS[id] ?? id;
}

function resolvePlatformForParse(url: string, selected: PlatformId): PlatformId {
  if (selected === 'auto') return 'auto';
  const detected = detectPlatformFromUrl(url);
  // 链接明显属于其他平台时，纠正 endpoint，避免打错接口
  if (detected && detected !== selected) return detected;
  return selected;
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
    </svg>
  );
}

function buildDownloadFilename(title: string, suffix?: string): string {
  const base = title.trim() || 'download';
  return suffix ? `${base}_${suffix}` : base;
}

function DownloadButton({
  url,
  label,
  filename,
  variant = 'primary',
  ariaLabel,
}: {
  url: string;
  label: string;
  filename: string;
  variant?: 'primary' | 'outline' | 'overlay';
  ariaLabel?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError(null);
    try {
      await downloadFile({ url, filename });
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败');
    } finally {
      setLoading(false);
    }
  };

  const className =
    variant === 'outline'
      ? 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
      : variant === 'overlay'
        ? 'inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-slate-800 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60'
        : 'inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900';

  const iconClass = variant === 'overlay' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="inline-flex shrink-0 flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={className}
        aria-label={ariaLabel}
      >
        {loading ? (
          <svg className={`${iconClass} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3" />
          </svg>
        )}
        {loading ? (variant === 'overlay' ? '' : '下载中…') : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function ZipDownloadButton({
  files,
  zipName,
  label = '打包下载',
  variant = 'outline',
}: {
  files: DownloadOptions[];
  zipName: string;
  label?: string;
  variant?: 'primary' | 'outline';
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (files.length === 0) return null;

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const result = await downloadAsZip({
        files,
        zipName,
        onProgress: (done) => setProgress(done),
      });
      if (result.failed > 0) {
        setError(`已打包 ${result.ok} 个，${result.failed} 个失败`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '打包下载失败');
    } finally {
      setLoading(false);
    }
  };

  const className =
    variant === 'primary'
      ? 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900'
      : 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700';

  return (
    <div className="inline-flex shrink-0 flex-col gap-1">
      <button type="button" onClick={handleClick} disabled={loading} className={className}>
        {loading ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <DownloadIcon />
        )}
        {loading ? `打包中 ${progress}/${files.length}` : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

function ExternalIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function ResultSection({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'accent' | 'muted';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-slate-50/80 dark:bg-slate-900/40'
      : tone === 'muted'
        ? 'bg-white dark:bg-slate-800/30'
        : 'bg-white dark:bg-transparent';

  return (
    <section className={`border-t border-slate-100 px-6 py-5 sm:px-7 sm:py-6 dark:border-slate-700/80 ${toneClass}`}>
      <p className="mb-4 text-[11px] font-semibold tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {title}
      </p>
      {children}
    </section>
  );
}

function ResultCard({ data }: { data: VideoData }) {
  const title = data.title?.trim() || '无标题';
  const downloads = [
    ...(data.url ? [{ url: data.url, label: '原画' }] : []),
    ...(data.video_backup?.map((b) => ({
      url: b.url,
      label: b.label ?? b.quality ?? '备用',
    })) ?? []),
  ];
  const multiDownload = downloads.length > 1;
  const hasMeta = Boolean(data.author?.name || data.stats);
  const imageFiles: DownloadOptions[] =
    data.images?.map((url, i) => ({
      url,
      filename: buildDownloadFilename(title, String(i + 1)),
    })) ?? [];
  const videoZipFiles: DownloadOptions[] = downloads.map((d) => ({
    url: d.url,
    filename: buildDownloadFilename(title, multiDownload ? d.label : undefined),
  }));
  const partZipFiles: DownloadOptions[] =
    data.parts
      ?.filter((p): p is typeof p & { url: string } => Boolean(p.url))
      .map((p, i) => ({
        url: p.url,
        filename: buildDownloadFilename(title, p.title ?? `P${i + 1}`),
      })) ?? [];
  const livePhotoFiles: DownloadOptions[] =
    data.live_photo?.map((url, i) => ({
      url,
      filename: buildDownloadFilename(title, `live_${i + 1}`),
    })) ?? [];

  return (
    <article className="animate-fade-in overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-700/80 dark:bg-slate-800/50 dark:shadow-none">
      {/* 主信息区 */}
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:gap-7 sm:p-7">
        {data.cover && (
          <div className="h-48 w-full shrink-0 self-start overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/60 sm:h-40 sm:w-40 dark:bg-slate-700 dark:ring-slate-600/50">
            <img
              src={data.cover}
              referrerPolicy="no-referrer"
              alt={data.title ? `${data.title} 封面` : '视频封面'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              <PlatformIcon id={data.platform} size={14} />
              {platformLabel(data.platform)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              {data.type === 'video' ? '视频' : data.type === 'image' ? '图集' : data.type}
            </span>
          </div>

          <h2 className="mt-3.5 text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-white">
            {data.title || '无标题'}
          </h2>

          {data.desc && (
            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {data.desc}
            </p>
          )}

          {hasMeta && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 dark:border-slate-700/80">
              {data.author?.name && (
                <div className="flex items-center gap-2.5">
                  {data.author.avatar && (
                    <img
                      src={data.author.avatar}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="h-7 w-7 rounded-full ring-2 ring-white dark:ring-slate-800"
                      loading="lazy"
                    />
                  )}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {data.author.name}
                  </span>
                </div>
              )}
              {data.stats && (
                <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                  {data.stats.play_count != null && (
                    <span>播放 {formatCount(data.stats.play_count)}</span>
                  )}
                  {data.stats.like_count != null && (
                    <span>点赞 {formatCount(data.stats.like_count)}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {downloads.length > 0 && (
        <ResultSection title="下载" tone="accent">
          <div className="flex flex-wrap gap-2.5">
            {downloads.map((d, i) => (
              <DownloadButton
                key={`${d.url}-${i}`}
                url={d.url}
                label={d.label}
                filename={buildDownloadFilename(title, multiDownload ? d.label : undefined)}
              />
            ))}
            {videoZipFiles.length > 1 && (
              <ZipDownloadButton
                files={videoZipFiles}
                zipName={buildDownloadFilename(title, 'videos')}
                label="打包下载"
              />
            )}
          </div>
        </ResultSection>
      )}

      {data.url && (
        <ResultSection title="媒体地址" tone="muted">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <span className="min-w-0 flex-1 break-all leading-relaxed">{data.url}</span>
            <ExternalIcon />
          </a>
        </ResultSection>
      )}

      {data.parts && data.parts.length > 0 && (
        <ResultSection title="分 P 列表" tone="muted">
          {partZipFiles.length > 1 && (
            <div className="mb-3.5">
              <ZipDownloadButton
                files={partZipFiles}
                zipName={buildDownloadFilename(title, 'parts')}
                label="打包下载全部分 P"
              />
            </div>
          )}
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 dark:divide-slate-700/80 dark:border-slate-700/80">
            {data.parts.map((part, i) => (
              <li key={part.url ?? `part-${i}`}>
                {part.url ? (
                  <a
                    href={part.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/40"
                  >
                    <span className="truncate">{part.title ?? `P${i + 1}`}</span>
                    <span className="shrink-0 text-slate-400">
                      <ExternalIcon />
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-400 dark:text-slate-500">
                    <span className="truncate">{part.title ?? `P${i + 1}`}</span>
                    <span className="shrink-0 text-xs">暂无地址</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {data.images && data.images.length > 0 && (
        <ResultSection title={`图集 · ${data.images.length}`} tone="muted">
          {imageFiles.length > 1 && (
            <div className="mb-3.5">
              <ZipDownloadButton
                files={imageFiles}
                zipName={buildDownloadFilename(title, 'images')}
                label="打包下载图集"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4">
            {data.images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/60 dark:bg-slate-700 dark:ring-slate-600/40"
              >
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full w-full cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                >
                  <img
                    src={src}
                    referrerPolicy="no-referrer"
                    alt={`图集第 ${i + 1} 张`}
                    className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                    loading="lazy"
                  />
                </a>
                <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/55 to-transparent p-2.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                  <DownloadButton
                    url={src}
                    label="下载"
                    filename={buildDownloadFilename(title, String(i + 1))}
                    variant="overlay"
                    ariaLabel={`下载第 ${i + 1} 张`}
                  />
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {livePhotoFiles.length > 0 && (
        <ResultSection title={`实况图 · ${livePhotoFiles.length}`} tone="muted">
          {livePhotoFiles.length > 1 && (
            <div className="mb-3.5">
              <ZipDownloadButton
                files={livePhotoFiles}
                zipName={buildDownloadFilename(title, 'live')}
                label="打包下载实况"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2.5">
            {livePhotoFiles.map((f, i) => (
              <DownloadButton
                key={`${f.url}-${i}`}
                url={f.url}
                label={`实况 ${i + 1}`}
                filename={f.filename ?? buildDownloadFilename(title, `live_${i + 1}`)}
                variant="outline"
              />
            ))}
          </div>
        </ResultSection>
      )}

      {data.music?.url && (
        <ResultSection title="背景音乐" tone="muted">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-slate-700/80 dark:bg-slate-900/40 sm:flex-nowrap sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {data.music.title ?? '未知曲目'}
              </p>
              {data.music.author && (
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {data.music.author}
                </p>
              )}
            </div>
            <DownloadButton
              url={data.music.url}
              label="下载"
              filename={buildDownloadFilename(data.music.title?.trim() || title)}
              variant="outline"
            />
          </div>
        </ResultSection>
      )}
    </article>
  );
}

export default function ParseForm() {
  const [platform, setPlatform] = useState<PlatformId>('auto');
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const [result, setResult] = useState<VideoData | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    checkHealth().then(setApiOnline);
  }, []);

  const handleSubmit = useCallback(
    async (e: { preventDefault(): void }) => {
      e.preventDefault();
      setError(null);
      setPasteHint(null);
      setResult(null);

      const extracted = extractVideoUrl(url, platform);
      if (!extracted) {
        setError('未找到有效链接，请粘贴包含视频地址的分享内容');
        return;
      }

      const resolvedId = resolvePlatformForParse(extracted, platform);
      const selected = PLATFORMS.find((p) => p.id === resolvedId);
      if (!selected) {
        setError('不支持的平台');
        return;
      }
      if (resolvedId !== platform && resolvedId !== 'auto') {
        setPlatform(resolvedId);
      }
      if (extracted !== url.trim()) setUrl(extracted);

      const requestId = ++requestIdRef.current;
      setLoading(true);

      try {
        const res: ApiResponse = await parseVideo({
          url: extracted,
          endpoint: selected.endpoint,
          method: selected.method,
          cookie: cookie || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        if (res.code === 200 && res.data) {
          setResult(res.data);
        } else {
          setError(res.msg || '解析失败，请检查链接后重试');
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const code = err instanceof Error ? err.message : '';
        if (code === 'NETWORK') {
          setError('无法连接 API 服务，请确认后端已启动');
        } else if (code === 'INVALID_JSON' || code.startsWith('HTTP_')) {
          setError('服务返回异常，请稍后重试');
        } else {
          setError('解析失败，请稍后重试');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [url, platform, cookie],
  );

  const handlePaste = useCallback(async () => {
    setPasteHint(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        applyPastedShareText(text, platform, setUrl, setPlatform);
      } else {
        setPasteHint('剪贴板为空');
      }
    } catch {
      setPasteHint('无法读取剪贴板，请手动粘贴或授权剪贴板权限');
    }
  }, [platform]);

  const handleInputPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text');
      if (!text) return;
      e.preventDefault();
      setPasteHint(null);
      applyPastedShareText(text, platform, setUrl, setPlatform);
    },
    [platform],
  );

  return (
    <div className="w-full min-w-0 max-w-xl space-y-9 animate-fade-in">
      {/* Platform picker — 自动识别为主，具体平台疏朗网格 */}
      <div className="space-y-5" role="group" aria-label="选择平台">
        <button
          type="button"
          onClick={() => setPlatform('auto')}
          aria-pressed={platform === 'auto'}
          className={`flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            platform === 'auto'
              ? 'bg-slate-900 text-white shadow-soft dark:bg-white dark:text-slate-900'
              : 'bg-white/80 text-slate-600 ring-1 ring-slate-200/80 hover:bg-white hover:text-slate-900 hover:ring-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:ring-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-white'
          }`}
        >
          <PlatformIcon id="auto" size={18} />
          <span>自动识别</span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${
              platform === 'auto'
                ? 'bg-white/15 text-white/80 dark:bg-slate-900/10 dark:text-slate-600'
                : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'
            }`}
          >
            推荐
          </span>
        </button>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
          <span className="shrink-0 text-[11px] font-medium tracking-[0.14em] text-slate-400 dark:text-slate-500">
            或指定平台
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {CONTENT_PLATFORMS.map((p) => {
            const selected = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                aria-pressed={selected}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:py-4 ${
                  selected
                    ? 'bg-slate-900 text-white shadow-soft dark:bg-white dark:text-slate-900'
                    : 'bg-white/70 text-slate-600 ring-1 ring-slate-200/70 hover:bg-white hover:text-slate-900 hover:ring-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700/70 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <PlatformIcon id={p.id} size={22} />
                <span className="text-xs font-medium leading-none">{p.label === '哔哩哔哩' ? 'B站' : p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="relative">
          <label htmlFor="video-url" className="sr-only">
            视频链接
          </label>
          <input
            id="video-url"
            type="text"
            inputMode="url"
            placeholder="粘贴分享文案或视频链接…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handleInputPaste}
            disabled={loading}
            autoComplete="off"
            className={`w-full rounded-2xl border border-slate-200/90 bg-white/90 py-4 pl-5 text-base text-slate-900 shadow-soft placeholder:text-slate-400 transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sky-500 ${
              url.trim() ? 'pr-32' : 'pr-20'
            }`}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {url.trim() && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setError(null);
                  setPasteHint(null);
                  setResult(null);
                }}
                disabled={loading}
                aria-label="清空输入"
                className="cursor-pointer rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                清空
              </button>
            )}
            <button
              type="button"
              onClick={handlePaste}
              disabled={loading}
              className="cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              粘贴
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-semibold text-white shadow-soft transition-colors duration-200 hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:ring-offset-slate-900"
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              解析中…
            </>
          ) : (
            '解析链接'
          )}
        </button>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="cursor-pointer text-sm text-slate-400 transition-colors duration-200 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:text-slate-500 dark:hover:text-slate-300 dark:focus-visible:ring-offset-slate-900"
          >
            {showAdvanced ? '收起高级选项' : '高级选项'}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <div>
                <label htmlFor="cookie" className="mb-1.5 block text-sm text-slate-500 dark:text-slate-400">
                  Cookie（可选，提高解析成功率）
                </label>
                <textarea
                  id="cookie"
                  rows={2}
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  disabled={loading}
                  placeholder="平台登录 Cookie"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </div>
      </form>

      {/* API status */}
      {apiOnline === false && (
        <p className="w-full max-w-full break-words rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          API 服务未响应（{getApiBase()}），请先启动后端服务
        </p>
      )}

      {pasteHint && (
        <p className="w-full max-w-full break-words rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {pasteHint}
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="w-full max-w-full overflow-hidden break-words rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700 [overflow-wrap:anywhere] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Result */}
      {result && <ResultCard data={result} />}
    </div>
  );
}
