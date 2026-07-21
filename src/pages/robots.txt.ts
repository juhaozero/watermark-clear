import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: string) => `User-agent: *
Allow: /

Sitemap: ${sitemapURL}
`;

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL(import.meta.env.SITE || 'http://localhost:4321');
  const base = import.meta.env.BASE_URL || '/';
  const sitemapPath = `${base}sitemap-index.xml`.replace(/\/{2,}/g, '/');
  const sitemapURL = new URL(sitemapPath, origin).href;

  return new Response(getRobotsTxt(sitemapURL), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
