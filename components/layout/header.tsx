"use client"

import { useSession } from "@/lib/auth/client"
import { useEffect, useState } from "react"

export function Header() {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      try {
        const { data } = await useSession()
        if (data?.session) {
          setUser({ email: data.session.user.email })
        }
      } catch (error) {
        console.error("Failed to fetch session:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSession()
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading ? "Loading..." : user?.email}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Welcome back!
          </span>
        </div>
      </div>
    </header>
  )
}
