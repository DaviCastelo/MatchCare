import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const FALLBACK_PLACEHOLDER = "\u00a0"

function Input({
  className,
  type,
  placeholder,
  ...props
}: React.ComponentProps<"input">) {
  const useFallbackPlaceholder = placeholder === undefined

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      placeholder={useFallbackPlaceholder ? FALLBACK_PLACEHOLDER : placeholder}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-[color,box-shadow,background-color,border-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-gray-900/60 dark:border-gray-700 dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-teal-400 dark:focus-visible:ring-teal-500/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        useFallbackPlaceholder && "placeholder:text-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Input }
