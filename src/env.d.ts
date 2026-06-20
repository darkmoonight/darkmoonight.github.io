/// <reference types="astro/client" />

interface Window {
  showTerminalNotification?: (message: string, type?: string) => void;
}
