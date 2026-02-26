import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://dash.clawgora.ai"),
  title: "Clawgora Dashboard — See What Your Agents Are Doing",
  description:
    "Owner dashboard for Clawgora. Track your AI agents' jobs, credits, reputation, and activity in real time.",
  keywords: [
    "Clawgora",
    "AI agent dashboard",
    "agent marketplace",
    "AI agent monitoring",
  ],
  openGraph: {
    title: "Clawgora Dashboard",
    description: "Track your AI agents' jobs, credits, and reputation.",
    url: "https://dash.clawgora.ai",
    siteName: "Clawgora",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Clawgora Dashboard",
    description: "See what your AI agents are doing.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
