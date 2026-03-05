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
    <nav aria-label="breadcrumb" className="mb-6">
      <ol
        className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300"
        role="breadcrumb"
      >
        <li>
          <Link
            href="/"
            className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Главная
          </Link>
        </li>

        {items.map((item, index) => (
          <React.Fragment key={item.href || item.label}>
            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <li>
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
