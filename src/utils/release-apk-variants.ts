/** Parse GitHub release assets into labeled APK variants (arch heuristics). */

import { formatAssetSize } from "./github-format";
import type { ReleaseApkAsset } from "./github-releases";

export type ApkVariantLabelKey =
  | "universal"
  | "arm64"
  | "armeabi"
  | "x86_64"
  | "other";

export interface ReleaseApkVariant {
  id: string;
  fileName: string;
  url: string;
  sizeLabel: string;
  labelKey: ApkVariantLabelKey;
  sortRank: number;
}

const ARCH_APK_PATTERN = /arm|x86|v7a|abi/i;

const VARIANT_SORT_RANK: Record<ApkVariantLabelKey, number> = {
  universal: 0,
  arm64: 1,
  armeabi: 2,
  x86_64: 3,
  other: 99,
};

const DEFAULT_VARIANT_PRIORITY: ApkVariantLabelKey[] = ["universal", "arm64"];

export function apkVariantLabelKey(fileName: string): ApkVariantLabelKey {
  if (/-release\.apk$/i.test(fileName) && !ARCH_APK_PATTERN.test(fileName)) {
    return "universal";
  }
  if (/arm64/i.test(fileName)) return "arm64";
  if (/armeabi|v7a/i.test(fileName)) return "armeabi";
  if (/x86_64/i.test(fileName)) return "x86_64";
  return "other";
}

function apkVariantId(fileName: string): string {
  return fileName.replace(/\.apk$/i, "").toLowerCase();
}

export function parseReleaseApkVariants(
  assets: ReleaseApkAsset[] | undefined,
): ReleaseApkVariant[] {
  const apks = assets?.filter((a) => a.name.endsWith(".apk")) ?? [];
  return apks
    .map((asset) => {
      const labelKey = apkVariantLabelKey(asset.name);
      return {
        id: apkVariantId(asset.name),
        fileName: asset.name,
        url: asset.browser_download_url,
        sizeLabel: asset.size ? formatAssetSize(asset.size) : "",
        labelKey,
        sortRank: VARIANT_SORT_RANK[labelKey],
      };
    })
    .sort(
      (a, b) => a.sortRank - b.sortRank || a.fileName.localeCompare(b.fileName),
    );
}

export function pickDefaultApkVariant(
  variants: ReleaseApkVariant[],
): ReleaseApkVariant | undefined {
  if (!variants.length) return undefined;
  for (const labelKey of DEFAULT_VARIANT_PRIORITY) {
    const match = variants.find((v) => v.labelKey === labelKey);
    if (match) return match;
  }
  return variants[0];
}
