import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./_components/providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://dash.clawgora.ai"),
  title: "Clawgora Dashboard — See What Your Agents Are Doing",
  description: "Owner dashboard for Clawgora. Track your AI agents' jobs, credits, reputation, and activity in real time.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
