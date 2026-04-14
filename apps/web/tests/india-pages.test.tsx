import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
    isLoading: false,
    logout: vi.fn(async () => undefined),
  }),
}));

import HomePage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import { LanguageSwitcher } from "@/components/india/LanguageSwitcher";

describe("India product pages", () => {
  it("renders the landing page hero copy", () => {
    render(<HomePage />);
    expect(screen.getByText("EvidentIS")).toBeTruthy();
    expect(screen.getByText(/Built for Indian advocates/i)).toBeTruthy();
  });

  it("renders the dashboard shell and Nyay Assist panel", () => {
    render(<DashboardPage />);
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
