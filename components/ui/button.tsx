import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-250 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black hover:bg-[#E5E5E5]",
        secondary:
          "bg-[#151515] border border-[#232323] text-white hover:bg-[#1B1B1B] hover:border-white/50",
        outline:
          "border border-[#232323] bg-transparent text-white hover:bg-[#151515] hover:border-white/50",
        ghost:
          "text-[#8A8A8A] hover:bg-[#151515] hover:text-white",
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
      },

      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4",
        lg: "h-12 px-7",
        icon: "h-11 w-11",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
