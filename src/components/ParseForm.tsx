import { useCallback, useEffect, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import {
  type ApiResponse,
  type VideoData,
  checkHealth,
  downloadFile,
  formatCount,
  getApiBase,
  parseVideo,
} from '../lib/api';
import { PLATFORMS, PLATFORM_LABELS, type PlatformId } from '../lib/platforms';
import { detectPlatformFromUrl, extractVideoUrl } from '../lib/url';
import PlatformIcon from './PlatformIcon';

function applyPastedShareText(
  text: string,
  platform: PlatformId,
  setUrl: (url: string) => void,
  setPlatform: (id: PlatformId) => void,
) {
  // 从文本中提取视频链接
  const extracted = extractVideoUrl(text, platform);
  if (!extracted) {
    setUrl(text.trim()); // 如果提取失败，则设置为文本的原始值
    return;
  }
  console.log('提取到的链接:', extracted);
  setUrl(extracted);
  const detected = detectPlatformFromUrl(extracted);
  if (detected) setPlatform(detected);
}

function platformLabel(id: string): string {
  return PLATFORM_LABELS[id] ?? id;
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
}: {
  url: string;
  label: string;
  filename: string;
  variant?: 'primary' | 'outline';
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await downloadFile({ url, filename });
    } catch {
      setError('下载失败');
    } finally {
      setLoading(false);
    }
  };

  const className =
    variant === 'outline'
      ? 'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
      : 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900';

  return (
    <div className="inline-flex flex-col gap-1">
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <DownloadIcon />
      )}
      {loading ? '下载中…' : label}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
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
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 dark:divide-slate-700/80 dark:border-slate-700/80">
            {data.parts.map((part, i) => (
              <li key={part.url ?? i}>
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
              </li>
            ))}
          </ul>
        </ResultSection>
      )}

      {data.images && data.images.length > 0 && (
        <ResultSection title={`图集 · ${data.images.length}`} tone="muted">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {data.images.map((src, i) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/60 transition-transform duration-200 hover:scale-[1.02] dark:bg-slate-700 dark:ring-slate-600/40"
              >
                <img
                  src={src}
                  referrerPolicy="no-referrer"
                  alt={`图集第 ${i + 1} 张`}
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </ResultSection>
      )}

      {data.music?.url && (
        <ResultSection title="背景音乐" tone="muted">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5 dark:border-slate-700/80 dark:bg-slate-900/40">
            <div className="min-w-0">
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
  const [platform, setPlatform] = useState<PlatformId>('douyin');
  const [url, setUrl] = useState('');
  const [cookie, setCookie] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoData | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setApiOnline);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setResult(null);

      const extracted = extractVideoUrl(url, platform);
      if (!extracted) {
        setError('未找到有效链接，请粘贴包含视频地址的分享内容');
        return;
      }

      const selected = PLATFORMS.find((p) => p.id === platform)!;
      if (extracted !== url.trim()) setUrl(extracted);

      setLoading(true);

      try {
        const res: ApiResponse = await parseVideo({
          url: extracted,
          endpoint: selected.endpoint,
          cookie: cookie || undefined,
          apiKey: apiKey || undefined,
        });

        if (res.code === 200 && res.data) {
          setResult(res.data);
        } else {
          setError(res.msg || '解析失败，请检查链接后重试');
        }
      } catch {
        setError(`无法连接 API 服务，请确认后端已启动`);
      } finally {
        setLoading(false);
      }
    },
    [url, platform, cookie, apiKey],
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) applyPastedShareText(text, platform, setUrl, setPlatform);
    } catch {
      /* clipboard denied */
    }
  }, [platform]);

  const handleInputPaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text');
      if (!text) return;
      e.preventDefault();
      applyPastedShareText(text, platform, setUrl, setPlatform);
    },
    [platform],
  );

  return (
    <div className="w-full max-w-2xl space-y-10">
      {/* Platform filter */}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="选择平台">
        {PLATFORMS.map((p) => {
          const selected = platform === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              aria-pressed={selected}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                selected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:ring-slate-600'
              }`}
            >
              <PlatformIcon id={p.id} size={16} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-5 pr-24 text-base text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
          />
          <button
            type="button"
            onClick={handlePaste}
            disabled={loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            粘贴
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white transition-colors duration-200 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
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
            className="cursor-pointer text-sm text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:ring-offset-slate-900"
          >
            {showAdvanced ? '收起高级选项' : '高级选项'}
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-3 animate-fade-in">
              <div>
                <label htmlFor="cookie" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  Cookie（可选，提高解析成功率）
                </label>
                <textarea
                  id="cookie"
                  rows={2}
                  value={cookie}
                  onChange={(e) => setCookie(e.target.value)}
                  disabled={loading}
                  placeholder="平台登录 Cookie"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              {/* <div>
                <label htmlFor="api-key" className="mb-1 block text-sm text-slate-600 dark:text-slate-400">
                  API Key（可选）
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                  placeholder="X-API-Key"
                  autoComplete="off"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
              </div> */}
            </div>
          )}
        </div>
      </form>

      {/* API status */}
      {apiOnline === false && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          API 服务未响应（{getApiBase()}），请先启动后端服务
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Result */}
      {result && <ResultCard data={result} />}
    </div>
  );
}
