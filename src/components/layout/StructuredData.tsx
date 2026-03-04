'use client'

import { useEffect, useState } from "react"

interface StructuredData {
  [key: string]: any
}

export function StructuredData() {
  const [data, setData] = useState<StructuredData | null>(null)

  useEffect(() => {
    // Динамическая генерация JSON-LD на основе текущего URL
    const url = window.location.href
    const pathname = window.location.pathname

    const structuredData: StructuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": process.env.NEXT_PUBLIC_SITE_NAME || "Мастерок",
      "description": "Бесплатные строительные калькуляторы онлайн",
      "url": url,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${process.env.NEXT_PUBLIC_SITE_URL || 'https://getmasterok.ru'}${pathname}?q={search_term_string}`,
        "query-input": "named required QueryInputItem 1"
      }
    }

    if (pathname.startsWith("/instrumenty/kalkulyator")) {
      structuredData["@type"] = "SoftwareApplication"
      structuredData["name"] = pathname.split("/").pop() || "Калькулятор материалов"
      structuredData["applicationCategory"] = "Utility"
      structuredData["operatingSystem"] = "Web Browser"
      structuredData["offers"] = {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "RUB",
        "availability": "https://schema.org/InStock"
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