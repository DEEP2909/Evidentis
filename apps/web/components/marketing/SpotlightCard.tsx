"use client";

import type { MouseEvent, ReactNode } from "react";
import { type HTMLMotionProps, motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type SpotlightCardProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children?: ReactNode;
};

export function SpotlightCard({
  className,
  children,
  ...props
}: SpotlightCardProps) {
  const reducedMotion = useReducedMotion();
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const spotlight = useMotionTemplate`radial-gradient(320px circle at ${mouseX}% ${mouseY}%, rgba(94,106,210,0.18), transparent 62%)`;

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <motion.div
      onMouseMove={handlePointerMove}
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl transition-transform duration-300 ease-out hover:-translate-y-1",
        className,
      )}
      {...props}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={reducedMotion ? undefined : { backgroundImage: spotlight }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
