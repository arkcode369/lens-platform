import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Image from "next/image"
import Link from "next/link"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Lens | See Your Idea Clearly",
  description: "AI-powered product validation platform. Validate ideas in 48 hours, not 48 weeks.",
  keywords: ["product validation", "market research", "AI", "startup", "product-market fit"],
  authors: [{ name: "Lens Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Lens - See Your Idea Clearly",
    description: "Validate product ideas in 48 hours with AI-powered market research",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Lens Logo",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50">
          Skip to main content
        </a>
        
        {children}
      </body>
    </html>
  )
}
