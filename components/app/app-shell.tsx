'use client'

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <TooltipProvider delay={0}>
        {sidebar}
        <SidebarInset className="bg-gray-50 dark:bg-gray-950">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
            <SidebarTrigger className="text-gray-600 dark:text-gray-400" />
          </header>
          <div className="flex-1 overflow-y-auto p-8">{children}</div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  )
}
