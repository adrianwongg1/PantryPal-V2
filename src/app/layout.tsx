import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme/constants";

// Self-hosted by Next at build time — matches Organic's own font choice
// (Caprasimo display over Figtree body) without the external Google Fonts
// @import Organic's own styles.css uses, so there's no extra network
// request or layout shift. Caprasimo ships weight 400 only.
const caprasimo = Caprasimo({
  variable: "--font-caprasimo",
  subsets: ["latin"],
  weight: ["400"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: "variable",
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
    <html
      lang="en"
      className={`${caprasimo.variable} ${figtree.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before first paint so a stored light/dark override applies
            immediately — without this, the page would flash the OS-default
            scheme for a frame before React hydrates ThemeToggle. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
