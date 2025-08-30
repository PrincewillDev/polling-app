import { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Home,
  Plus,
  BarChart3,
  User,
  LogOut,
  Settings
} from 'lucide-react'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Polling App
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
              <Link
                href="/polls"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                My Polls
              </Link>
              <Link
                href="/polls/create"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Poll
              </Link>
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="relative h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium leading-none">John Doe</div>
                  <div className="text-xs leading-none text-muted-foreground mt-1">
                    john.doe@example.com
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
