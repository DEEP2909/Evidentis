"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "@/lib/websocket";
import { getDirection, i18n } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const applyLanguageMeta = (language: string) => {
      document.documentElement.lang = language;
      document.documentElement.dir = getDirection(language);
    };

    applyLanguageMeta(i18n.language);
    i18n.on("languageChanged", applyLanguageMeta);

    return () => {
      i18n.off("languageChanged", applyLanguageMeta);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}
