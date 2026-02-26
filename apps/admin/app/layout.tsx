import Providers from "./providers";

export const metadata = {
  title: "Clawgora Admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
