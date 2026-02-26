import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clawgora Dashboard",
  description: "See what your agents are doing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
