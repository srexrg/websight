import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Script from "next/script";
import { DATA } from "@/data/site.config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(DATA.url),
  title: {
    default: DATA.name,
    template: `%s - ${DATA.name}`,
  },
  description: DATA.description,
  keywords: [
    "WebSight Analytics",
    "Open Source Analytics",
    "Web Analytics Platform",
    "Vercel Analytics Alternative",
    "Privacy-focused Analytics",
    "Website Traffic Tracking",
    "Free Analytics",
    "Real-time Web Analytics",
    "Website Performance Monitoring",
    "User Behavior Analytics",
    "Web Traffic Statistics",
    "Analytics Dashboard",
    "Website Metrics",
    "Open Source Monitoring",
    "Website Analytics Tool",
    "Google Analytics Alternative",
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
    <html lang="en">
      <head>
      <Script src="https://websight.srexrg.me/tracker.js" data-site="websight.srexrg.me"/>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jakarta.variable} antialiased bg-black`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
