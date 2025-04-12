'use client'
import React from 'react'
import { Button } from '@/components/ui/moving-border'

export function MovingBorderDemo() {
  return (
    <div>
      <Button
        duration={2000}
        borderRadius="1.75rem"
        className="bg-white dark:bg-slate-900 text-black dark:text-white border-neutral-200 dark:border-slate-800"
      >
        Borders are cool
      </Button>
    </div>
  )
}
