export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function formatBytesSize(size: number, unit: "bytes" | "kb"): string {
  if (!Number.isFinite(size) || size <= 0) return "";

  if (unit === "kb") {
    if (size >= 1024) return `${(size / 1024).toFixed(1)} MB`;
    return `${size} KB`;
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

export function formatRepoSize(sizeKb: number): string {
  return formatBytesSize(sizeKb, "kb") || `${sizeKb} KB`;
}

export function formatAssetSize(bytes: number): string {
  return formatBytesSize(bytes, "bytes");
}

export function establishedYear(createdAt: string | undefined): number {
  if (!createdAt) return 2021;
  const year = new Date(createdAt).getFullYear();
  return Number.isFinite(year) ? year : 2021;
}

export function blogHost(
  blog: string | null | undefined,
  fallbackHost: string,
): string {
  if (!blog) return fallbackHost;
  try {
    const url = blog.startsWith("http")
      ? new URL(blog)
      : new URL(`https://${blog}`);
    return url.hostname;
  } catch {
    const stripped = stripTrailingSlash(blog.replace(/^https?:\/\//, ""));
    return stripped || fallbackHost;
  }
}

export function normalizeBlogUrl(
  blog: string | null | undefined,
  fallback: string,
): string {
  if (!blog) return fallback;
  return blog.startsWith("http") ? blog : `https://${blog}`;
}
