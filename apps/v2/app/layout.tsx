import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Nusa Food Task System v2",
  description: "v2 (Next.js + REST API + PostgreSQL) — dikembangkan paralel dengan v1.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
