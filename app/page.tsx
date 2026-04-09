import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Search, BarChart3, Users, Zap, Shield } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/logo.png"
              alt="Lens Logo"
              width={120}
              height={120}
              className="mx-auto"
              priority
            />
          </div>

          {/* Tagline */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            See Your{" "}
            <span className="text-blue-600">Idea</span> Clearly
          </h1>

          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Validate product ideas in 48 hours, not 48 weeks. AI-powered market research that tells you what to build.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg"
            >
              Start Validating
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors shadow-lg border border-gray-200"
            >
              View Pricing
            </Link>
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Market Signals</h3>
              <p className="text-gray-600">
                Scan Reddit, Twitter, Product Hunt for real demand indicators
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Validation Score</h3>
              <p className="text-gray-600">
                Get a 0-100 score with detailed breakdown and recommendations
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">MVP Scoping</h3>
              <p className="text-gray-600">
                Data-backed feature prioritization using RICE framework
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">48h</div>
              <div className="text-sm text-gray-600 mt-1">Validation Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">10+</div>
              <div className="text-sm text-gray-600">Data Sources</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">80%</div>
              <div className="text-sm text-gray-600">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">1000+</div>
              <div className="text-sm text-gray-600">Ideas Validated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo-white.png"
              alt="Lens Logo"
              width={40}
              height={40}
              className="mr-3"
            />
            <span className="text-xl font-bold">Lens</span>
          </div>
          <p className="text-gray-400 text-sm">
            © 2026 Lens. See Your Idea Clearly.
          </p>
        </div>
      </footer>
    </div>
  )
}
