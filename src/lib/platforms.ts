export type PlatformId =
  | 'auto'
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
}

export const PLATFORMS: Platform[] = [
  { id: 'auto', label: '自动识别', endpoint: '/api/parse' },
  { id: 'douyin', label: '抖音', endpoint: '/api/douyin' },
  { id: 'kuaishou', label: '快手', endpoint: '/api/kuaishou' },
  { id: 'xiaohongshu', label: '小红书', endpoint: '/api/xiaohongshu' },
  { id: 'bilibili', label: '哔哩哔哩', endpoint: '/api/bilibili' },
  { id: 'weibo', label: '微博', endpoint: '/api/weibo' },
  { id: 'doubao', label: '豆包', endpoint: '/api/doubao' },
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
