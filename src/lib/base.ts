/** 拼接 Astro base 路径，避免部署在子路径时静态资源 404 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalized = path.replace(/^\//, '');
  return `${base}${normalized}`;
}
