const PUBLIC_ASSET_PREFIX = /^\/?assets\//;
const assetBase = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;

export function assetUrl(path: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
  const relativePath = path.replace(PUBLIC_ASSET_PREFIX, "assets/");
  return `${assetBase}${relativePath}`;
}
