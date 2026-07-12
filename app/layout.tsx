import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import Script from "next/script";
import { DATA } from "@/data/site.config";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(DATA.url),
  applicationName: DATA.name,
  category: "technology",
  title: {
    default: `${DATA.name} - Open-Source, Privacy-First Web Analytics`,
    template: `%s - ${DATA.name}`,
  },
  description: DATA.description,
  keywords: [
    "Google Analytics Alternative",
    "Open Source Analytics",
    "Privacy-focused Analytics",
    "Cookieless Analytics",
    "Realtime Web Analytics",
    "Self-hosted Analytics",
    "Web Analytics Platform",
    "Session Replay",
  ],
  authors: [
    {
      name: `${DATA.name}`,
      url: DATA.url,
    },
  ],
  creator: `${DATA.name}`,
  openGraph: {
    title: `${DATA.name}`,
    description: DATA.description,
    url: DATA.url,
    images: [
      {
        url: DATA.prevImage,
      },
    ],
    siteName: `${DATA.name}`,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  twitter: {
    title: `${DATA.name}`,
    card: "summary_large_image",
    site: DATA.url,
    creator: `${DATA.name}`,
    description: DATA.description,
    images: [
      {
        url: DATA.prevImage,
        width: 1200,
        height: 630,
        alt: `${DATA.name}`,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      {/* Self-tracking via the v2 tracker, served from our own origin.
          The script no-ops on localhost, so dev stays clean. */}
      <Script
        src="/t.js"
        data-site={
          process.env.NEXT_PUBLIC_SELF_SITE ??
          (process.env.NEXT_PUBLIC_APP_URL
            ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
            : "websight.srexrg.me")
        }
        strategy="afterInteractive"
      />
      </head>
      <body
        className={`${hanken.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
