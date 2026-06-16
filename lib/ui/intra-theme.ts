export const intraColors = {
  brand: {
    blue: "#0B2C4A",
    green: "#2ECC71",
    greenHover: "#24b861",
    greenHoverApp: "#27ae60",
    greenHoverAlt: "#29b765",
    accentBlue: "#0ea5e9",
  },
  background: {
    landing: "#f7f3eb",
    app: "#f5f8fb",
    card: "#ffffff",
    softSurface: "#eef6f1",
    neutralPill: "#EEF2F7",
    neutralSoftAlt: "#F7FAFD",
  },
  text: {
    muted: "#667085",
    subtle: "#3B526B",
    success: "#1e8c4e",
  },
  border: {
    base: "#e4e7ec",
    strong: "#D9E4F0",
    soft: "#D7E5F1",
  },
  state: {
    success: "#1e8c4e",
    successSoft: "#EFFBF4",
    successSoftAlt: "#F7FFF9",
    successBorder: "#CDEFD9",
    warning: "#F39C12",
    warningSoft: "#FFF7ED",
    warningSoftAlt: "#FFF4D6",
    warningBorder: "#F6D9A6",
    warningText: "#8A5A00",
    warningTextStrong: "#A56A00",
    warningAlt: "#D4A017",
    danger: "#D92D20",
    dangerSoft: "#FEF3F2",
    dangerBorder: "#FECDCA",
    dangerText: "#B42318",
    info: "#0B5CAD",
    infoSoft: "#EEF4FB",
    infoSoftAlt: "#F8FBFF",
    rating: "#fbbf24",
  },
  overlay: {
    base: "rgba(11, 44, 74, 0.74)",
    soft: "rgba(11, 44, 74, 0.46)",
  },
  skeleton: {
    start: "#EEF2F7",
    mid: "#F5F8FB",
  },
  table: {
    header: "#F7FAFD",
    rowHover: "#F5F8FB",
  },
  hero: {
    dashboardMid: "#103656",
    dashboardEnd: "#123d61",
    authMid: "#123d61",
    authEnd: "#0f6b52",
  },
  trust: {
    soft: "#FFF9EB",
    border: "#FDECC8",
    iconBg: "#FEF0D7",
    iconText: "#B47B25",
  },
} as const;

export const intraTypography = {
  levels: {
    title: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
    subtitle: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
    body: { fontSize: 14, lineHeight: 22, fontWeight: 400 },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: 400 },
    metric: { fontSize: 30, lineHeight: 36, fontWeight: 800 },
  },
  variants: {
    bodyStrong: { level: "body", fontSize: 14, lineHeight: 22, fontWeight: 600 },
    captionStrong: { level: "caption", fontSize: 12, lineHeight: 18, fontWeight: 600 },
    badgeText: { level: "caption", fontSize: 12, lineHeight: 16, fontWeight: 700 },
    metricCompact: { level: "metric", fontSize: 18, lineHeight: 24, fontWeight: 800 },
  },
  landingException: {
    heroTitle: { desktop: 52, mobile: 40, lineHeight: 1.05, fontWeight: 800 },
    sectionTitle: { desktop: 44, mobile: 32, lineHeight: 1.12, fontWeight: 800 },
    lead: { desktop: 20, mobile: 17, lineHeight: 32, fontWeight: 400 },
    body: { desktop: 16, mobile: 15, lineHeight: 26, fontWeight: 400 },
    navLink: { desktop: 14, mobile: 14, lineHeight: 20, fontWeight: 600 },
    badge: { desktop: 12, mobile: 12, lineHeight: 16, fontWeight: 700 },
    priceAmount: { desktop: 48, mobile: 38, lineHeight: 1, fontWeight: 800 },
  },
  // Temporary compatibility aliases. Do not use these names as the v3.0 recommended API.
  legacyAliases: {
    h1: "title",
    pageTitle: "title",
    h2: "subtitle",
    h3: "subtitle",
    h4: "bodyStrong",
    label: "bodyStrong",
    stepLabel: "captionStrong",
    button: "bodyStrong",
  },
} as const;

export const intraRadius = {
  xs: 12,
  sm: 16,
  md: 24,
  pill: 999,
} as const;

export const intraShadow = {
  base: "0 16px 50px rgba(11, 44, 74, 0.08)",
  nav: "0 12px 40px rgba(11, 44, 74, 0.08)",
  hero: "0 22px 70px rgba(11, 44, 74, 0.18)",
  overlay: "0 24px 70px rgba(11, 44, 74, 0.20)",
  drawer: "-18px 0 50px rgba(11, 44, 74, 0.16)",
  bottomSheet: "0 -18px 50px rgba(11, 44, 74, 0.16)",
} as const;

export const intraViewportQa = {
  corePcBase: { width: 1440, height: 800 },
  corePcMinimum: { width: 1366, height: 650 },
  browserZoomPercent: 100,
  osScalePercent: 100,
  mobileMustAvoidHorizontalScroll: true,
} as const;

export const intraComponentTokens = {
  cta: {
    minHeight: 44,
    compactMinHeight: 40,
    stableWidthOnStateChange: true,
  },
  fields: {
    minHeight: 44,
    textareaMinHeight: 96,
    focusRing: "rgba(46, 204, 113, 0.15)",
    dangerRing: "rgba(217, 45, 32, 0.10)",
  },
  badges: {
    maxCompactCard: 2,
    maxNormalCard: 3,
    maxMobilePerRow: 2,
  },
  modals: {
    maxWidth: 640,
    portalTarget: "document.body",
    zIndexToken: "--intra-z-overlay",
  },
  drawers: {
    width: 420,
    portalTarget: "document.body",
  },
  bottomSheets: {
    maxHeightViewportRatio: 0.88,
    portalTarget: "document.body",
  },
  skeleton: {
    animationMs: 1400,
    shouldMirrorContentShape: true,
  },
  tables: {
    desktopPattern: "compact-table",
    mobilePattern: "compact-row-cards",
  },
} as const;

export const intraSizing = {
  button: {
    navHeight: 44,
    landingHeight: 50,
    appMinHeight: 44,
    appMaxHeight: 48,
    compactMinHeight: 40,
    compactMaxHeight: 44,
  },
  input: {
    minHeight: 44,
  },
  clickable: {
    minArea: 40,
  },
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    hero: 28,
    empty: 32,
    compact: 14,
    body: 16,
    emphasis: 20,
  },
  iconContainer: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
    hero: 64,
    empty: 56,
    compact: 24,
    body: 32,
    emphasis: 40,
  },
  iconStroke: {
    default: 1.75,
    strong: 2,
  },
  layout: {
    landingMaxWidth: 1200,
    appMaxWidth: 1280,
  },
  gap: {
    xs: 4,
    sm: 8,
    md: 12,
    card: 16,
    section: 24,
    lg: 32,
  },
} as const;

export const intraIconographyRules = {
  library: "lucide-react",
  style: "minimal-linear",
  defaultStroke: 1.75,
  strongStroke: 2,
  disallowInlineSvgInProductScreens: true,
  disallowCaricatureIcons: true,
  disallowOversizedIconsAgainstText: true,
  body14MaxIconPx: 18,
  subtitleRecommendedIconMinPx: 18,
  subtitleRecommendedIconMaxPx: 20,
  titleRecommendedIconMinPx: 28,
  titleRecommendedIconMaxPx: 32,
} as const;

export const intraRules = {
  manualVersion: "3.0",
  manualPath: "docs/ui-ux/Manual_UIUX_INTRA_v3_0_Oficial.pdf",
  maxPrimaryActionsPerScreen: 1,
  fontFamilyPrimary: "Inter",
  fontFamilyMono: "Geist Mono",
  appTextMinimumPx: 14,
  buttonMinimumHeightPx: 40,
  inputMinimumHeightPx: 44,
  clickableMinimumAreaPx: 40,
  stableActionWidthOnLabelSwap: true,
  internalAppDisallowFreeDisplaySizes: true,
  internalAppDisallowLandingTypography: true,
  dashboardsShouldFitViewportWhenShort: true,
  proportionalIconographyRequired: true,
  disallowNativeConfirm: true,
  disallowNativeAlert: true,
  disallowInlineSvgInProductScreens: true,
  disallowHardcodedHexOutsideOfficialTokens: true,
  criticalActionsUseIntraConfirmDialog: true,
  fieldErrorsAreInline: true,
  chatErrorsStayInChatFlow: true,
  notFoundStatesAreCentered: true,
} as const;
