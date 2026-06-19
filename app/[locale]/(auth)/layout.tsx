import type { ReactNode } from 'react'

// Shared shell for all auth screens (login, register, pending-approval).
// Theme-aware background with ambient teal glows — works in light & dark.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-teal-400/30 dark:bg-teal-500/15 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-cyan-400/20 dark:bg-cyan-500/10 blur-3xl animate-blob [animation-delay:4s]" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-emerald-300/20 dark:bg-emerald-500/10 blur-3xl animate-blob [animation-delay:8s]" />
        {/* subtle dot grid */}
        <div className="absolute inset-0 [background-image:radial-gradient(circle,_var(--border)_1px,_transparent_1px)] [background-size:22px_22px] opacity-40 dark:opacity-20" />
      </div>
      {children}
    </div>
  )
}
