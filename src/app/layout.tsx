import type { Metadata } from "next";
import { Libre_Baskerville, Work_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carve | Agentic Commerce",
  description:
    "Making your products visible and purchasable through AI shopping agents. Connection, optimization, and performance for the agentic commerce era.",
  openGraph: {
    title: "Carve | Agentic Commerce",
    description:
      "Making your products visible and purchasable through AI shopping agents. Connection, optimization, and performance for the agentic commerce era.",
    type: "website",
    locale: "en_US",
    siteName: "Carve",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carve | Agentic Commerce",
    description:
      "Making your products visible and purchasable through AI shopping agents. Connection, optimization, and performance for the agentic commerce era.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${libreBaskerville.variable} ${workSans.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
