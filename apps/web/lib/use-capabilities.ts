"use client";

import { useAuthStore } from "@/lib/auth";
import { getCaps, type AdvocateRole, type RoleCapabilities } from "@/lib/role-capabilities";

export function useCapabilities(): RoleCapabilities {
  const { user } = useAuthStore();
  return getCaps((user?.role ?? "junior_advocate") as AdvocateRole);
}
