import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  EB_Garamond,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-ui",
  weight: ["400", "500", "600", "700"],
});

const bodyFont = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body-ui",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-ui",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Process Library Catalog",
  description:
    "Browse and explore process definitions, agents, and skills for the babysitter framework",
  keywords: [
    "process",
    "catalog",
    "agents",
    "skills",
    "babysitter",
    "automation",
  ],
  authors: [{ name: "A5C AI" }],
  openGraph: {
    title: "Process Library Catalog",
    description:
      "Browse and explore process definitions, agents, and skills for the babysitter framework",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${display.variable} ${bodyFont.variable} ${mono.variable} min-h-screen antialiased`}
      >
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
