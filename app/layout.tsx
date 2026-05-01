import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://intra-chi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "INTRA — Envía paquetes con viajeros reales",
    template: "%s | INTRA",
  },
  description:
    "Conecta con viajeros que ya van a tu destino. Envía documentos y paquetes entre ciudades desde $20.000 COP. Rápido, seguro y sin intermediarios.",
  openGraph: {
    title: "INTRA — Envía paquetes con viajeros reales",
    description:
      "Envía documentos y paquetes entre ciudades colombianas. Viajeros reales, precios desde $20.000 COP.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 920,
        height: 780,
        alt: "INTRA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "INTRA — Envía paquetes con viajeros reales",
    description:
      "Envía documentos y paquetes entre ciudades colombianas. Viajeros reales, precios desde $20.000 COP.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [{ url: "/atlas-reference/favicon-atlas.svg", type: "image/svg+xml" }],
    shortcut: ["/atlas-reference/favicon-atlas.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
