'use client'

import { useEffect, useState } from "react"
import { SITE_NAME, SITE_URL, SITE_WEBPAGE_DESCRIPTION } from "@/lib/site"

interface StructuredData {
  [key: string]: any
}

const TOOL_PAGE_SCHEMA: Array<{
  match: (pathname: string) => boolean
  name: string
  type: string
  applicationCategory?: string
}> = [
  {
    match: (pathname) => pathname.startsWith("/instrumenty/kalkulyator"),
    name: "Строительный калькулятор",
    type: "SoftwareApplication",
    applicationCategory: "Utility",
  },
  {
    match: (pathname) => pathname.startsWith("/instrumenty/konverter"),
    name: "Конвертер строительных единиц",
    type: "SoftwareApplication",
    applicationCategory: "Utility",
  },
  {
    match: (pathname) => pathname.startsWith("/instrumenty/ploshchad-komnaty"),
    name: "Калькулятор площади комнаты",
    type: "WebPage",
  },
]

export function StructuredData() {
  const [data, setData] = useState<StructuredData | null>(null)

  useEffect(() => {
    const url = window.location.href
    const pathname = window.location.pathname
    const schemaOverride = TOOL_PAGE_SCHEMA.find((item) => item.match(pathname))

    const structuredData: StructuredData = {
      "@context": "https://schema.org",
      "@type": schemaOverride?.type ?? "WebPage",
      name: schemaOverride?.name ?? SITE_NAME,
      description: SITE_WEBPAGE_DESCRIPTION,
      url,
      potentialAction: {
        "@type": "SearchAction",
        target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}${pathname}?q={search_term_string}`,
      },
        "query-input": "named required QueryInputItem 1",
      },
    }

    if (schemaOverride?.type === "SoftwareApplication") {
      structuredData.applicationCategory = schemaOverride.applicationCategory
      structuredData.operatingSystem = "Web Browser"
      structuredData.offers = {
        "@type": "Offer",
        price: "0",
        priceCurrency: "RUB",
        availability: "https://schema.org/InStock",
      }
    }

    setData(structuredData)
  }, [])

  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}



