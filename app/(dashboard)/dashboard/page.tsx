'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, BarChart3, Users, TrendingUp } from 'lucide-react'

// Mock data - replace with actual data fetching
const mockStats = {
  totalPolls: 12,
  totalVotes: 847,
  activePolls: 8,
  totalViews: 2456
}

const mockRecentPolls = [
  {
    id: '1',
    title: 'What is your favorite programming language?',
    status: 'active',
    votes: 145,
    createdAt: '2024-01-15',
    responses: 4
  },
  {
    id: '2',
    title: 'Best time for team meetings?',
    status: 'active',
    votes: 67,
    createdAt: '2024-01-14',
    responses: 5
  },
  {
    id: '3',
    title: 'Office lunch preferences',
    status: 'closed',
    votes: 234,
    createdAt: '2024-01-12',
    responses: 6
  }
]

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's an overview of your polling activity.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalPolls}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Polls</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activePolls}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalViews}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Polls</CardTitle>
            <CardDescription>Your latest polling activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentPolls.map((poll) => (
                <div key={poll.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{poll.title}</h3>
                    <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                      <span>{poll.votes} votes</span>
                      <span>{poll.responses} options</span>
                      <span>Created {poll.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={poll.status === 'active' ? 'default' : 'secondary'}>
                      {poll.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/polls/${poll.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" asChild>
              <Link href="/polls/create">
                <Plus className="w-4 h-4 mr-2" />
                Create New Poll
              </Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/polls">
                <BarChart3 className="w-4 h-4 mr-2" />
                View All Polls
              </Link>
            </Button>
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Tips</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Keep poll questions clear and concise</li>
                <li>• Add deadlines to encourage participation</li>
                <li>• Share polls with targeted audiences</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
