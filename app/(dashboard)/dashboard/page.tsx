import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, TrendingUp, Users, AlertCircle } from "lucide-react"

const stats = [
  {
    name: "Total Validations",
    value: "12",
    change: "+3 from last month",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  {
    name: "Completion Rate",
    value: "78%",
    change: "+12% from last month",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50"
  },
  {
    name: "Active Interviews",
    value: "8",
    change: "Currently ongoing",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  },
  {
    name: "Pending Reviews",
    value: "5",
    change: "Needs attention",
    icon: AlertCircle,
    color: "text-orange-600",
    bgColor: "bg-orange-50"
  }
]

const recentValidations = [
  {
    id: 1,
    title: "AI-Powered Recipe Generator",
    status: "in_progress",
    score: 72,
    date: "2026-04-05"
  },
  {
    id: 2,
    title: "Smart Home Energy Optimizer",
    status: "completed",
    score: 85,
    date: "2026-04-03"
  },
  {
    id: 3,
    title: "Personal Finance Coach App",
    status: "draft",
    score: null,
    date: "2026-04-01"
  },
  {
    id: 4,
    title: "Virtual Fitness Trainer",
    status: "completed",
    score: 91,
    date: "2026-03-28"
  },
  {
    id: 5,
    title: "Language Learning Gamification",
    status: "in_progress",
    score: 68,
    date: "2026-03-25"
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Validations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Validations</CardTitle>
          <CardDescription>
            Your latest product validation projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentValidations.map((validation) => (
              <div
                key={validation.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {validation.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created {new Date(validation.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      validation.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : validation.status === "in_progress"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {validation.status.replace("_", " ")}
                  </span>
                  {validation.score && (
                    <span className="text-sm font-medium text-gray-900">
                      Score: {validation.score}/100
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Your current plan and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Free Plan</p>
              <p className="text-sm text-gray-500 mt-1">
                5 validations per month • Basic analytics
              </p>
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
              Upgrade Plan
            </button>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Usage</span>
              <span className="font-medium">3/5</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "60%" }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
