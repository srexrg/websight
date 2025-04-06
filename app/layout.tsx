import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Oswald } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Script from "next/script";

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
  title: {
    default: "WebSight - Simple Analytics for Modern Websites",
    template: "%s | WebSight"
  },
  description: "Track pageviews, visits, and custom events without compromising user privacy",
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
        className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} ${jakarta.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
