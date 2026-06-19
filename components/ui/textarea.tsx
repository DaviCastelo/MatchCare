import * as React from "react"

import { cn } from "@/lib/utils"

const FALLBACK_PLACEHOLDER = "\u00a0"

function Textarea({
  className,
  placeholder,
  ...props
}: React.ComponentProps<"textarea">) {
  const useFallbackPlaceholder = placeholder === undefined

  return (
    <textarea
      data-slot="textarea"
      placeholder={useFallbackPlaceholder ? FALLBACK_PLACEHOLDER : placeholder}
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-[color,box-shadow,background-color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-gray-900/60 dark:border-gray-700 dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-teal-400 dark:focus-visible:ring-teal-500/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        useFallbackPlaceholder && "placeholder:text-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
