import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/lib/i18n";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/auth", () => ({
  useAuthStore: () => ({
    user: {
      role: "advocate",
      displayName: "Test Advocate",
      email: "test@example.com",
    },
    isAuthenticated: true,
    isLoading: false,
    checkAuth: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
  }),
}));

import HomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
}

describe("India product pages", () => {
  it("renders the landing page hero copy", () => {
    render(<HomePage />);
    expect(screen.getByRole("img", { name: "EvidentIS" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /intelligent decision system/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /open platform/i })).toBeTruthy();
  });

  it("renders the dashboard shell and Nyay Assist panel", () => {
    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );
    expect(screen.getAllByText("Nyay Assist").length).toBeGreaterThan(0);
    expect(screen.getByText("Open matters")).toBeTruthy();
  });

  it("renders a multilingual language switcher", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByLabelText("language-switcher")).toBeTruthy();
    expect(screen.getByRole("option", { name: "हिन्दी" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "اردو" })).toBeTruthy();
  });
});
