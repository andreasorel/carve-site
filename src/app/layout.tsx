import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Carve | Agentic Commerce Partners",
  description:
    "Carve partners with ambitious retailers to win agentic commerce. Free Agent Readiness Score. AI-powered feed optimization. Forward-deployed commerce engineers.",
  openGraph: {
    title: "Carve | Agentic Commerce Partners",
    description:
      "Carve partners with ambitious retailers to win agentic commerce. Free Agent Readiness Score. AI-powered feed optimization. Forward-deployed commerce engineers.",
    type: "website",
    locale: "en_US",
    siteName: "Carve",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carve | Agentic Commerce Partners",
    description:
      "Carve partners with ambitious retailers to win agentic commerce. Free Agent Readiness Score. AI-powered feed optimization. Forward-deployed commerce engineers.",
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
        className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
