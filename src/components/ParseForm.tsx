import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  type ApiResponse,
  type VideoData,
  checkHealth,
  formatCount,
  getApiBase,
  parseVideo,
} from '../lib/api';
import { PLATFORMS, PLATFORM_LABELS, type PlatformId } from '../lib/platforms';
import PlatformIcon from './PlatformIcon';

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

function ExternalIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function ResultCard({ data }: { data: VideoData }) {
  const downloads = [
    ...(data.url ? [{ url: data.url, label: '原画' }] : []),
    ...(data.video_backup?.map((b) => ({
      url: b.url,
      label: b.label ?? b.quality ?? '备用',
    })) ?? []),
  ];

  return (
    <article className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-col gap-6 p-6 sm:flex-row">
        {data.cover && (
          <div className="shrink-0">
            <img
              src={data.cover}
              alt={data.title ? `${data.title} 封面` : '视频封面'}
              className="h-40 w-full rounded-xl object-cover sm:h-36 sm:w-36"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <PlatformIcon id={data.platform} size={14} />
              {platformLabel(data.platform)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {data.type === 'video' ? '视频' : data.type === 'image' ? '图集' : data.type}
            </span>
          </div>
          <h2 className="text-lg font-semibold leading-snug text-slate-900 dark:text-white">
            {data.title || '无标题'}
          </h2>
          {data.desc && (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {data.desc}
            </p>
          )}
          {data.author?.name && (
            <div className="flex items-center gap-2">
              {data.author.avatar && (
                <img
                  src={data.author.avatar}
                  alt=""
                  className="h-6 w-6 rounded-full"
                  loading="lazy"
                />
              )}
              <span className="text-sm text-slate-600 dark:text-slate-400">{data.author.name}</span>
            </div>
          )}
          {data.stats && (
            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
              {data.stats.play_count != null && (
                <span>播放 {formatCount(data.stats.play_count)}</span>
              )}
              {data.stats.like_count != null && (
                <span>点赞 {formatCount(data.stats.like_count)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {downloads.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            下载
          </p>
          <div className="flex flex-wrap gap-2">
            {downloads.map((d, i) => (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900"
              >
                <DownloadIcon />
                {d.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {data.parts && data.parts.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            分 P 列表
          </p>
          <ul className="space-y-2">
            {data.parts.map((part, i) => (
              <li key={part.url ?? i}>
                <a
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50"
                >
                  <span className="truncate">{part.title ?? `P${i + 1}`}</span>
                  <ExternalIcon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.images && data.images.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            图集 ({data.images.length})
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data.images.map((src, i) => (
              <a
                key={src}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700"
              >
                <img
                  src={src}
                  alt={`图集第 ${i + 1} 张`}
                  className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {data.music?.url && (
        <div className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            背景音乐
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                {data.music.title ?? '未知曲目'}
              </p>
              {data.music.author && (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {data.music.author}
                </p>
              )}
            </div>
            <a
              href={data.music.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <DownloadIcon />
              下载
            </a>
          </div>
        </div>
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

      const trimmed = url.trim();
      if (!trimmed) {
        setError('请输入有效的视频链接');
        return;
      }

      const selected = PLATFORMS.find((p) => p.id === platform)!;
      setLoading(true);

      try {
        const res: ApiResponse = await parseVideo({
          url: trimmed,
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
      if (text) setUrl(text.trim());
    } catch {
      /* clipboard denied */
    }
  }, []);

  return (
    <div className="w-full max-w-2xl space-y-8">
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
            type="url"
            inputMode="url"
            placeholder="粘贴短视频分享链接…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
              <div>
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
              </div>
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
