import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CookiesPDF - Smart PDF Learning Assistant',
  description: 'AI-powered PDF chat and flashcard generation for smart learning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-dark-50 via-white to-primary-50">
          {children}
        </div>
      </body>
    </html>
  )
} 