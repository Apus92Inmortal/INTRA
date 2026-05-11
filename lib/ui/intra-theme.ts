export const intraColors = {
  blue: "#0B2C4A",
  green: "#2ECC71",
  greenHover: "#24b861",
  greenHoverApp: "#27ae60",
  greenHoverAlt: "#29b765",
  bgLanding: "#f7f3eb",
  bgApp: "#f5f8fb",
  card: "#ffffff",
  softSurface: "#eef6f1",
  neutralPill: "#EEF2F7",
  successSoft: "#EFFBF4",
  successBorder: "#CDEFD9",
  textMuted: "#667085",
  textSubtle: "#3B526B",
  border: "#e4e7ec",
  softBorder: "#D7E5F1",
  textSuccess: "#1e8c4e",
  warning: "#F39C12",
  warningSoft: "#FFF7ED",
  warningAlt: "#D4A017",
  ratingStar: "#fbbf24",
  accentBlue: "#0ea5e9",
  danger: "#D92D20",
  dangerSoft: "#FEF3F2",
  dangerBorder: "#FECDCA",
  authHeroMid: "#123d61",
  authHeroEnd: "#0f6b52",
} as const;

export const intraTypography = {
  app: {
    h1: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
    pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: 700 },
    h2: { fontSize: 22, lineHeight: 28, fontWeight: 700 },
    h3: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
    h4: { fontSize: 16, lineHeight: 22, fontWeight: 700 },
    body: { fontSize: 14, lineHeight: 22, fontWeight: 400 },
    bodyStrong: { fontSize: 14, lineHeight: 22, fontWeight: 600 },
    label: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
    button: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
    caption: { fontSize: 12, lineHeight: 18, fontWeight: 400 },
    stepLabel: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
    badge: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
    metric: { fontSize: 30, lineHeight: 36, fontWeight: 800 },
    metricSmall: { fontSize: 20, lineHeight: 26, fontWeight: 800 },
  },
  landing: {
    heroTitle: { desktop: 52, mobile: 40, lineHeight: 1.05, fontWeight: 800 },
    sectionTitle: { desktop: 44, mobile: 32, lineHeight: 1.12, fontWeight: 800 },
    lead: { desktop: 20, mobile: 17, lineHeight: 32, fontWeight: 400 },
    body: { desktop: 16, mobile: 15, lineHeight: 26, fontWeight: 400 },
    navLink: { desktop: 14, mobile: 14, lineHeight: 20, fontWeight: 600 },
    badge: { desktop: 12, mobile: 12, lineHeight: 16, fontWeight: 700 },
    priceAmount: { desktop: 48, mobile: 38, lineHeight: 1, fontWeight: 800 },
  },
} as const;

export const intraRadius = {
  xs: 12,
  sm: 16,
  md: 24,
  pill: 999,
} as const;

export const intraShadow = {
  base: "0 16px 50px rgba(11, 44, 74, .08)",
  nav: "0 12px 40px rgba(11, 44, 74, .08)",
  hero: "0 22px 70px rgba(11, 44, 74, .18)",
} as const;

export const intraViewportQa = {
  commonPhysicalDesktop: { width: 1366, height: 768 },
  minimumUsefulViewport: { width: 1366, height: 650 },
  baseDesktopViewport: { width: 1440, height: 800 },
  browserZoomPercent: 100,
  osScalePercent: 100,
} as const;

export const intraDashboardRules = {
  heroMaxHeightPx: 140,
  pageVerticalPaddingMinPx: 16,
  pageVerticalPaddingMaxPx: 24,
  sectionGapMinPx: 16,
  sectionGapMaxPx: 20,
  mainCardPaddingMinPx: 20,
  mainCardPaddingMaxPx: 24,
  compactCardPaddingMinPx: 16,
  compactCardPaddingMaxPx: 20,
  metricCardMinHeightPx: 84,
  metricCardMaxHeightPx: 100,
  emptyStateMaxHeightPx: 260,
} as const;

export const intraSizing = {
  button: {
    navHeight: 44,
    landingHeight: 50,
    appMinHeight: 44,
    appMaxHeight: 48,
    compactMinHeight: 36,
    compactMaxHeight: 40,
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
  disallowCaricatureIcons: true,
  disallowOversizedIconsAgainstText: true,
  body14MaxIconPx: 18,
  h3RecommendedIconMinPx: 18,
  h3RecommendedIconMaxPx: 20,
  h1HeroRecommendedIconMinPx: 28,
  h1HeroRecommendedIconMaxPx: 32,
} as const;

export const intraRules = {
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
} as const;
