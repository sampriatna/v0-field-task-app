import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'TaskNF3 - Nusa Food Task & Report System',
  description: 'Sistem manajemen tugas operasional untuk Kopi Buri Umah, Kisamen Noodle Bar, dan Samtaro Express',
  generator: 'TaskNF3',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png?v=tasknf3-2',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png?v=tasknf3-2',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.png?v=tasknf3-2',
        type: 'image/png',
      },
    ],
    apple: '/apple-icon.png?v=tasknf3-2',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className="bg-background">
      <body className="font-sans antialiased min-h-screen">
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
