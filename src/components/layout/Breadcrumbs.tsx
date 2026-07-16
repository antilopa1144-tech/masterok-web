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
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null

  return (
    <nav
      aria-label="breadcrumb"
      className="mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol
        className="flex w-max min-w-full items-center gap-2 whitespace-nowrap pb-1 text-sm text-slate-600 dark:text-slate-300"
      >
        <li className="shrink-0">
          <Link
            href="/"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Главная
          </Link>
        </li>

        {items.map((item, index) => (
          <React.Fragment key={item.href || item.label}>
            <ChevronRight className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-400" aria-hidden="true" />
            <li className="shrink-0">
              {item.href ? (
                <Link
                  href={item.href}
                  className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors ${
                    index === items.length - 1
                      ? 'text-slate-500 dark:text-slate-400 pointer-events-none'
                      : ''
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
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
