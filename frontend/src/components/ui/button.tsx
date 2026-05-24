import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[5px] whitespace-nowrap rounded-[6px] border text-[13px] font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "border-teal-700 bg-teal-600 text-white hover:bg-teal-700",
        secondary: "border-[0.5px] border-border-strong bg-transparent text-text-1 hover:bg-surface-2",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, className }), "px-3 py-[6px]")} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
