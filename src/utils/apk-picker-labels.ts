import type { ApkVariantLabelKey } from "./release-apk-variants";

const VARIANT_I18N_KEYS: Record<ApkVariantLabelKey, string> = {
  universal: "projectDetail.apkVariantUniversal",
  arm64: "projectDetail.apkVariantArm64",
  armeabi: "projectDetail.apkVariantArmeabi",
  x86_64: "projectDetail.apkVariantX86_64",
  other: "projectDetail.apkVariantOther",
};

export type ApkPickerLabels = {
  groupAria: string;
  variantLabels: Record<ApkVariantLabelKey, string>;
};

export type ApkLabelTranslator = (key: string) => string;

export function buildApkPickerLabels(t: ApkLabelTranslator): ApkPickerLabels {
  const variantLabels = {} as Record<ApkVariantLabelKey, string>;
  for (const key of Object.keys(VARIANT_I18N_KEYS) as ApkVariantLabelKey[]) {
    variantLabels[key] = t(VARIANT_I18N_KEYS[key]);
  }
  return {
    groupAria: t("projectDetail.apkPickerAria"),
    variantLabels,
  };
}
