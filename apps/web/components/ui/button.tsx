import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]",
  {
    variants: {
      variant: {
        default:
          "border border-primary/35 bg-[linear-gradient(135deg,rgba(104,114,217,1),rgba(79,129,255,0.92))] text-primary-foreground shadow-[0_0_0_1px_rgba(94,106,210,0.14),0_12px_26px_rgba(94,106,210,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:brightness-110",
        destructive:
          "border border-red-400/30 bg-[linear-gradient(135deg,rgba(220,38,38,0.95),rgba(248,113,113,0.85))] text-destructive-foreground shadow-[0_0_0_1px_rgba(248,113,113,0.12),0_12px_22px_rgba(220,38,38,0.24)] hover:-translate-y-0.5",
        outline:
          "border border-white/10 bg-white/[0.04] text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/18 hover:bg-white/[0.08] hover:text-white",
        secondary:
          "border border-white/8 bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/14 hover:bg-white/[0.07]",
        ghost: "text-white/68 hover:bg-white/[0.06] hover:text-white",
        link: "rounded-none text-primary underline-offset-4 hover:text-white hover:underline",
        gold:
          "border border-primary/30 bg-[linear-gradient(135deg,rgba(135,148,255,0.25),rgba(94,106,210,0.2))] text-white shadow-[0_0_0_1px_rgba(94,106,210,0.12),0_10px_24px_rgba(94,106,210,0.18)] hover:-translate-y-0.5 hover:border-primary/45",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
