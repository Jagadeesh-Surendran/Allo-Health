import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Real-time inventory reservation system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-950 antialiased`}>
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
            <span className="text-lg font-bold tracking-tight text-slate-950">Allo</span>
            <span className="font-light text-slate-400">Inventory</span>
          </div>
        </nav>
        <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
