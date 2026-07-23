import { withBase } from './base';

export type PlatformId =
  | 'auto'
  | 'douyin'
  | 'kuaishou'
  | 'xiaohongshu'
  | 'bilibili'
  | 'weibo'
  | 'doubao';

/** 可按域名识别的具体平台（不含自动识别） */
export type DetectablePlatformId = Exclude<PlatformId, 'auto'>;

export interface Platform {
  id: PlatformId;
  label: string;
  endpoint: string;
  /** 默认 POST；自动识别接口为 GET */
  method?: 'GET' | 'POST';
  icon: string;
}

export const PLATFORMS: Platform[] = [
  { id: 'auto', label: '自动识别', endpoint: '/api/parse', method: 'GET', icon: '' },
  { id: 'douyin', label: '抖音', endpoint: '/api/douyin', icon: 'icons/douyin.png' },
  { id: 'kuaishou', label: '快手', endpoint: '/api/kuaishou', icon: 'icons/kuaishou.png' },
  { id: 'xiaohongshu', label: '小红书', endpoint: '/api/xiaohongshu', icon: 'icons/xiaohongshu.png' },
  { id: 'bilibili', label: '哔哩哔哩', endpoint: '/api/bilibili', icon: 'icons/bilibili.png' },
  { id: 'weibo', label: '微博', endpoint: '/api/weibo', icon: 'icons/weibo.png' },
  { id: 'doubao', label: '豆包', endpoint: '/api/doubao', icon: 'icons/doubao.png' },
];

/** 展示用具体平台列表（不含自动识别） */
export const CONTENT_PLATFORMS = PLATFORMS.filter((p) => p.id !== 'auto');

export const PLATFORM_LABELS: Record<string, string> = {
  auto: '自动识别',
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  xhs: '小红书',
  bilibili: '哔哩哔哩',
  weibo: '微博',
  doubao: '豆包',
};

const ICON_ALIASES: Record<string, DetectablePlatformId> = {
  xhs: 'xiaohongshu',
};

export function getPlatformIcon(id: string): string {
  if (id === 'auto') return '';
  const key = (ICON_ALIASES[id] ?? id) as DetectablePlatformId;
  const icon = PLATFORMS.find((p) => p.id === key)?.icon ?? 'icons/douyin.png';
  return withBase(icon);
}

export function getPlatformLabel(id: string): string {
  return PLATFORM_LABELS[id] ?? id;
}
