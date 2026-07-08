import { withBase } from './base';

export type PlatformId =
  | 'douyin'
  | 'kuaishou'
  | 'xiaohongshu'
  | 'bilibili'
  | 'weibo'
  | 'doubao';

export interface Platform {
  id: PlatformId;
  label: string;
  endpoint: string;
  icon: string;
}

export const PLATFORMS: Platform[] = [
  { id: 'douyin', label: '抖音', endpoint: '/api/douyin', icon: 'icons/douyin.png' },
  { id: 'kuaishou', label: '快手', endpoint: '/api/kuaishou', icon: 'icons/kuaishou.png' },
  { id: 'xiaohongshu', label: '小红书', endpoint: '/api/xiaohongshu', icon: 'icons/xiaohongshu.png' },
  { id: 'bilibili', label: '哔哩哔哩', endpoint: '/api/bilibili', icon: 'icons/bilibili.png' },
  { id: 'weibo', label: '微博', endpoint: '/api/weibo', icon: 'icons/weibo.png' },
  { id: 'doubao', label: '豆包', endpoint: '/api/doubao', icon: 'icons/doubao.png' },
];

export const PLATFORM_LABELS: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  xhs: '小红书',
  bilibili: '哔哩哔哩',
  weibo: '微博',
  doubao: '豆包',
};

const ICON_ALIASES: Record<string, PlatformId> = {
  xhs: 'xiaohongshu',
};

export function getPlatformIcon(id: string): string {
  const key = (ICON_ALIASES[id] ?? id) as PlatformId;
  const icon = PLATFORMS.find((p) => p.id === key)?.icon ?? 'icons/douyin.png';
  return withBase(icon);
}

export function getPlatformLabel(id: string): string {
  return PLATFORM_LABELS[id] ?? id;
}
