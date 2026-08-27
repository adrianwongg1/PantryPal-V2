import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Replaces the default Next.js placeholder favicon.ico (deleted alongside
// this file) with the real "bowl & sprout" mark. Rendered through Satori,
// which has no stylesheet cascade — Logo's default var(--color-accent)
// fills would resolve to nothing here, so this is the one place literal
// hex is passed explicitly (see Logo's own `colors` prop comment). Values
// are Organic's light-mode --color-accent-2 / --color-accent-2-400 /
// --color-accent, copied rather than referenced, and a light --color-bg
// square behind the mark so it stays legible on both light and dark
// browser chrome.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5ead8",
          borderRadius: 7,
        }}
      >
        <svg width={24} height={24} viewBox="0 0 48 48" fill="none">
          <path d="M24 22c0-7 4-11 12-12 1 7-4 12-10 12" fill="#7a8a5e" />
          <path d="M24 22c0-5-3-8-8-9-1 5 3 9 7 9" fill="#aebf92" />
          <path d="M8 25h32a16 16 0 01-16 15A16 16 0 018 25z" fill="#c67139" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
