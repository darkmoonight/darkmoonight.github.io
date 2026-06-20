import { DEFAULT_BUGS_SQUASHED, STORAGE_KEYS } from "../constants/storage";

export function initBugsCounter(): void {
  if (!localStorage.getItem(STORAGE_KEYS.bugsSquashed)) {
    localStorage.setItem(
      STORAGE_KEYS.bugsSquashed,
      String(DEFAULT_BUGS_SQUASHED),
    );
  }
}

export function getBugsSquashedString(): string {
  return (
    localStorage.getItem(STORAGE_KEYS.bugsSquashed) ||
    String(DEFAULT_BUGS_SQUASHED)
  );
}

function getBugsSquashed(): number {
  return Number(getBugsSquashedString());
}

export function addBugsSquashed(delta: number): number {
  const next = getBugsSquashed() + delta;
  localStorage.setItem(STORAGE_KEYS.bugsSquashed, String(next));
  document.dispatchEvent(new CustomEvent("sync-bugs-squashed"));
  return next;
}
