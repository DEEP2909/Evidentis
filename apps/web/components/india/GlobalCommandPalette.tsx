"use client";

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Command, FileText, FolderOpen, LayoutDashboard, Search, Sparkles } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";

type QuickAction = {
  label: string;
  href: string;
  hint: string;
  icon: ComponentType<{ className?: string }>;
  roles?: string[];
};

const QUICK_ACTIONS: readonly QuickAction[] = [
  { label: "Dashboard", href: "/dashboard", hint: "Overview and activity", icon: LayoutDashboard },
  { label: "Matters", href: "/matters", hint: "Open and track matters", icon: FolderOpen },
  { label: "Documents", href: "/documents", hint: "Document intelligence", icon: FileText },
  { label: "Research", href: "/research", hint: "Case law and bare acts", icon: Search, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { label: "Nyay Assist", href: "/nyay-assist", hint: "AI drafting and legal queries", icon: Sparkles, roles: ["admin", "senior_advocate", "junior_advocate", "advocate", "partner"] },
  { label: "Analytics", href: "/analytics", hint: "Firm trend intelligence", icon: Command, roles: ["admin", "senior_advocate", "partner"] },
];

export function GlobalCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const previousPathnameRef = useRef(pathname);
  const role = user?.role ?? "junior_advocate";

  const filteredActions = useMemo(() => {
    const baseActions = isAuthenticated
      ? QUICK_ACTIONS.filter((action) => !action.roles || action.roles.includes(role))
      : [
          {
            label: "Sign In",
            href: "/login",
            hint: "Access your workspace",
            icon: Command,
          } satisfies QuickAction,
        ];

    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return baseActions;
    }

    return baseActions.filter((action) => {
      const haystack = `${action.label} ${action.hint} ${action.href}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [isAuthenticated, role, query]);

  useEffect(() => {
    const onGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onGlobalShortcut);
    return () => window.removeEventListener("keydown", onGlobalShortcut);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPaletteKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (!filteredActions.length) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filteredActions.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + filteredActions.length) % filteredActions.length);
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const target = filteredActions[activeIndex] ?? filteredActions[0];
        if (target) {
          router.push(target.href);
          setOpen(false);
        }
      }
    };

    window.addEventListener("keydown", onPaletteKeys);
    return () => window.removeEventListener("keydown", onPaletteKeys);
  }, [open, filteredActions, activeIndex, router]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      return;
    }

    previousPathnameRef.current = pathname;
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass border-white/20 bg-slate-950 text-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Command className="h-4 w-4 text-saffron-400" />
            Command Palette
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Jump to any workspace area quickly. Use Arrow keys and Enter to navigate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions..."
            aria-label="Command palette search input"
            className="focus-saffron"
          />

          <div className="max-h-[320px] overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-1.5">
            {filteredActions.length ? (
              filteredActions.map((action, index) => {
                const Icon = action.icon;
                const isActive = index === activeIndex;
                return (
                  <button
                    type="button"
                    key={action.href}
                    onClick={() => {
                      router.push(action.href);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
                      isActive ? "bg-saffron-500/20 text-white" : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? "text-saffron-300" : "text-white/50")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{action.label}</p>
                      <p className="truncate text-xs text-white/45">{action.hint}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-white/35" />
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-white/55">No matching actions.</div>
            )}
          </div>

          <p className="text-xs text-white/45">
            Shortcut: <span className="rounded bg-white/10 px-1.5 py-0.5">Ctrl/Cmd + K</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
