'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  tone?: 'default' | 'inverse'
}

export function Breadcrumbs({ items, tone = 'default' }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null

  const isInverse = tone === 'inverse'

  return (
    <nav
      aria-label="breadcrumb"
      className="mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol
        className={`flex w-max min-w-full items-center gap-2 whitespace-nowrap pb-1 text-sm ${
          isInverse ? 'text-white/80' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        <li className="shrink-0">
          <Link
            href="/"
            className={
              isInverse
                ? 'text-white/90 transition-colors hover:text-white'
                : 'transition-colors hover:text-slate-900 dark:hover:text-slate-100'
            }
          >
            Главная
          </Link>
        </li>

        {items.map((item, index) => (
          <React.Fragment key={item.href || item.label}>
            <ChevronRight
              className={`h-4 w-4 shrink-0 ${
                isInverse ? 'text-white/45' : 'text-slate-400 dark:text-slate-400'
              }`}
              aria-hidden="true"
            />
            <li className="shrink-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className={
                    isInverse
                      ? `transition-colors hover:text-white ${
                          index === items.length - 1
                            ? 'pointer-events-none text-white/65'
                            : 'text-white/90'
                        }`
                      : `transition-colors hover:text-slate-900 dark:hover:text-slate-100 ${
                          index === items.length - 1
                            ? 'pointer-events-none text-slate-500 dark:text-slate-400'
                            : ''
                        }`
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isInverse
                      ? 'text-white/65'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  {item.label}
                </span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}
