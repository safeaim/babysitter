import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

export const metadata: Metadata = {
  title: "Atlas Graph Explorer",
  description: "Browse the Atlas catalog graph: NodeKinds, EdgeKinds, records, and associations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="cpd-dark h-full antialiased">
      <body className="atlas-body">
        <div className="mk-dashboard atlas-app-shell">
          <Sidebar />
          <div className="atlas-app-main">
            <Header />
            <main className="atlas-main-content">{children}</main>
          </div>
        </div>
        <KeyboardShortcuts />
      </body>
    </html>
  );
}
