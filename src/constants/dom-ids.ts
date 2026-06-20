export const DOM_IDS = {
  siteHeader: "site-header",
  commandPaletteModal: "command-palette-modal",
  commandPaletteContent: "command-palette-content",
  searchPaletteTrigger: "search-palette-trigger",
  mobileNavDrawer: "mobile-nav-drawer",
  prModal: "pr-modal",
  prModalContent: "pr-modal-content",
  closePrModal: "close-pr-modal",
  closePrModalBtn: "close-pr-modal-btn",
  newsCommitsList: "news-commits-list-container",
  newsCommitsTotal: "news-commits-total",
  retroArcadeModal: "retro-arcade-modal",
  rmRfGlitchOverlay: "rm-rf-glitch-overlay",
} as const;

export const OVERLAY_MODALS = [
  {
    backdropId: DOM_IDS.commandPaletteModal,
    panelId: DOM_IDS.commandPaletteContent,
  },
  {
    backdropId: DOM_IDS.prModal,
    panelId: DOM_IDS.prModalContent,
  },
] as const;
