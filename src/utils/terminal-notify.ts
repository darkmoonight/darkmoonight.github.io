export type TerminalToastType = "info" | "success" | "error" | "warning";

export function notifyTerminal(
  message: string,
  type: TerminalToastType = "info",
): void {
  window.showTerminalNotification?.(message, type);
}
