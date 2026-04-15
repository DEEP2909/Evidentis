"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<BrandLogoSize, string> = {
  sm: "h-6 sm:h-7",
  md: "h-8 sm:h-9",
  lg: "h-10 sm:h-12",
  xl: "h-14 sm:h-16",
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
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-start",
        SIZE_MAP[size],
        className,
      )}
    >
      <Image
        src="/logo_1.png"
        alt="EvidentIS"
        width={800}
        height={200}
        priority={priority}
        className="w-auto h-full object-contain"
      />
    </div>
  );
}
