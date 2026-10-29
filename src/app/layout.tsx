import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const display = Pixelify_Sans({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700"] });
const body = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-body", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "WEB//SIGNAL",
  description: "A private signal for two.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "WEB//SIGNAL", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071A3B",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
