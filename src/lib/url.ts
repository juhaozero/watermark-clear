import type { DetectablePlatformId, PlatformId } from './platforms';

/** 各平台常见分享域名，用于从混杂文本中识别链接 */
const PLATFORM_DOMAINS: Record<DetectablePlatformId, RegExp[]> = {
  douyin: [/v\.douyin\.com/i, /(?:www\.)?douyin\.com/i, /iesdouyin\.com/i],
  kuaishou: [/v\.kuaishou\.com/i, /(?:www\.)?kuaishou\.com/i, /chenzhongtech\.com/i],
  xiaohongshu: [/xhslink\.com/i, /(?:www\.)?xiaohongshu\.com/i, /xhs\.cn/i],
  bilibili: [/b23\.tv/i, /(?:www\.)?bilibili\.com/i, /bili2233\.cn/i],
  weibo: [/weibo\.com/i, /weibo\.cn/i],
  doubao: [/doubao\.com/i],
};

const URL_IN_TEXT =
  /https?:\/\/[^\s<>"{}|\\^`[\]　，。！？；：、）】》」』"'`]+/gi;

/** 去掉链接末尾常见标点 */
function trimUrlTail(raw: string): string {
  return raw.replace(/[.,;:!?)\]}>'"…、。！？；：]+$/u, '');
}

/** 从文本中提取所有 http(s) 链接 */
export function findUrlsInText(text: string): string[] {
  const matches = text.match(URL_IN_TEXT);
  if (!matches) return [];
  return matches.map(trimUrlTail);
}

function matchesPlatform(url: string, platform: DetectablePlatformId): boolean {
  return PLATFORM_DOMAINS[platform].some((re) => re.test(url));
}

/** 根据链接判断平台 */
export function detectPlatformFromUrl(url: string): DetectablePlatformId | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_DOMAINS) as [
    DetectablePlatformId,
    RegExp[],
  ][]) {
    if (patterns.some((re) => re.test(url))) return platform;
  }
  return null;
}

/**
 * 从分享文案中提取视频链接。
 * 若指定具体平台，优先返回匹配该平台的链接；自动识别 / 未指定则返回第一个可识别平台的链接。
 */
export function extractVideoUrl(text: string, platform?: PlatformId): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const urls = findUrlsInText(trimmed);
  if (urls.length === 0) {
    // 用户可能只贴了纯链接
    return /^https?:\/\//i.test(trimmed) ? trimUrlTail(trimmed) : null;
  }

  if (platform && platform !== 'auto') {
    const matched = urls.find((u) => matchesPlatform(u, platform));
    if (matched) return matched;
  }

  const recognized = urls.find((u) => detectPlatformFromUrl(u) !== null);
  return recognized ?? urls[0] ?? null;
}
