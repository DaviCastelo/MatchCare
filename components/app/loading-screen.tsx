import { MatchCareLogo } from '@/components/app/matchcare-logo'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-950 z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="relative animate-pulse px-6">
          <MatchCareLogo className="max-w-[220px]" priority />
        </div>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}
