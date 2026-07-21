/** 站点 SEO 默认文案与结构化数据 */

export const SITE_NAME = 'Parse Video';

export const DEFAULT_TITLE = 'Parse Video - 视频去水印解析';

export const DEFAULT_DESCRIPTION =
  '粘贴分享链接，一键解析抖音、快手、小红书、B站、微博、豆包等平台的无水印视频与图集，免费在线使用。';

export const DEFAULT_KEYWORDS = [
  '视频去水印',
  '无水印解析',
  '抖音去水印',
  '快手去水印',
  '小红书去水印',
  'B站解析',
  '微博视频下载',
  '在线视频解析',
].join(',');

export interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

/** 生成完整页面标题（首页用站点名，子页追加站点名） */
export function resolveTitle(title?: string): string {
  if (!title || title === SITE_NAME || title === DEFAULT_TITLE) {
    return DEFAULT_TITLE;
  }
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

/** WebApplication JSON-LD */
export function buildWebAppJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    inLanguage: 'zh-CN',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
    ...(opts.image ? { image: opts.image } : {}),
  };
}
