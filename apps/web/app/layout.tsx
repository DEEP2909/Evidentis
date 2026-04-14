import type { Metadata } from "next";
import Script from "next/script";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "EvidentIS | India Legal Intelligence Cloud",
  description: "Enterprise Indian legal SaaS for advocates, law firms, and corporate legal teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Script id="global-cmdk-shortcut" strategy="afterInteractive">
          {`
            window.addEventListener("keydown", function(event) {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                var target = document.querySelector('input[aria-label="Research query input"]');
                if (target && target.focus) target.focus();
              }
            });
          `}
        </Script>
      </body>
    </html>
  );
}
