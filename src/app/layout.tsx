import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Self-hosted by Next at build time — matches Modernist's font choice
// (Archivo) without the external Google Fonts @import Modernist's own
// styles.css uses, so there's no extra network request or layout shift.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "PantryPal",
    template: "%s · PantryPal",
  },
  description:
    "Turn what's in your kitchen into a cookable recipe in seconds.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
