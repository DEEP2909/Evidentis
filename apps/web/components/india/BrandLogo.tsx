"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<BrandLogoSize, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
};

export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: {
  size?: BrandLogoSize;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative inline-flex shrink-0 items-center", SIZE_MAP[size], className)}>
      <Image
        src="/logo.png"
        alt="EvidentIS"
        width={1152}
        height={648}
        priority={priority}
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
