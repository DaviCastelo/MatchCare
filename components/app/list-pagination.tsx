'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type ListPaginationProps = {
  page: number
  totalPages: number
  from: number
  to: number
  total: number
  onPageChange: (page: number) => void
  labels: {
    showing: string
    previous: string
    next: string
    pageOf: string
  }
}

export function ListPagination({
  page,
  totalPages,
  from,
  to,
  total,
  onPageChange,
  labels,
}: ListPaginationProps) {
  if (total === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-sm text-muted-foreground">{labels.showing}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          {labels.previous}
        </Button>
        <span className="text-sm text-muted-foreground px-2 tabular-nums">
          {labels.pageOf}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="gap-1"
        >
          {labels.next}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
