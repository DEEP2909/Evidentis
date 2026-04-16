"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<BrandLogoSize, string> = {
  sm: "h-8 sm:h-9",
  md: "h-10 sm:h-12",
  lg: "h-14 sm:h-16",
  xl: "h-20 sm:h-24",
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
        width={1000}
        height={250}
        priority={priority}
        className="w-auto h-full object-contain"
      />
    </div>
  );
}
