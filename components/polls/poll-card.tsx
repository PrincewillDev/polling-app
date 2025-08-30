'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  Users,
  Calendar,
  Clock,
  Eye,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PollOption {
  id: string
  text: string
  votes: number
  percentage: number
}

interface Poll {
  id: string
  title: string
  description?: string
  status: 'active' | 'closed' | 'draft'
  category: string
  votes: number
  views: number
  responses: number
  createdAt: string
  updatedAt: string
  endDate?: string
  options?: PollOption[]
  allowMultipleChoice: boolean
  isOwner?: boolean
}

interface PollCardProps {
  poll: Poll
  variant?: 'default' | 'compact' | 'detailed'
  showActions?: boolean
  onEdit?: (pollId: string) => void
  onDelete?: (pollId: string) => void
  onVote?: (pollId: string, optionIds: string[]) => void
}

export function PollCard({
  poll,
  variant = 'default',
  showActions = true,
  onEdit,
  onDelete,
  onVote
}: PollCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'closed':
        return 'secondary'
      case 'draft':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime()
    const end = new Date(endDate).getTime()
    const difference = end - now

    if (difference <= 0) return 'Ended'

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days} days left`
    if (hours > 0) return `${hours} hours left`
    return 'Less than 1 hour left'
  }

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    switch (action) {
      case 'edit':
        onEdit?.(poll.id)
        break
      case 'delete':
        if (confirm('Are you sure you want to delete this poll?')) {
          onDelete?.(poll.id)
        }
        break
    }
  }

  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getStatusColor(poll.status)} className="text-xs">
                  {poll.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {poll.category}
                </Badge>
              </div>
              <h3 className="font-medium text-sm truncate">
                <Link
                  href={`/polls/${poll.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {poll.title}
                </Link>
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {poll.votes}
                </span>
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-1" />
                  {poll.views}
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/polls/${poll.id}`}>View</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getStatusColor(poll.status)}>
                  {poll.status}
                </Badge>
                <Badge variant="outline">{poll.category}</Badge>
                {poll.endDate && poll.status === 'active' && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeRemaining(poll.endDate)}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg mb-2">
                <Link
                  href={`/polls/${poll.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {poll.title}
                </Link>
              </CardTitle>
              {poll.description && (
                <CardDescription className="text-base">
                  {poll.description}
                </CardDescription>
              )}
            </div>
            {showActions && poll.isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={(e) => handleAction('edit', e)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Poll
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => handleAction('delete', e)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Poll
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Poll options preview */}
          {poll.options && poll.options.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Top Options:</h4>
              <div className="space-y-2">
                {poll.options.slice(0, 3).map((option) => (
                  <div key={option.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{option.text}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <Progress value={option.percentage} className="w-16 h-1" />
                      <span className="text-xs text-gray-500 w-8 text-right">
                        {option.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
                {poll.options.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{poll.options.length - 3} more options
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="flex items-center text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              <span>{poll.votes} votes</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Eye className="w-4 h-4 mr-1" />
              <span>{poll.views} views</span>
            </div>
            <div className="flex items-center text-gray-600">
              <BarChart3 className="w-4 h-4 mr-1" />
              <span>{poll.responses} options</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{formatDate(poll.createdAt)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {poll.allowMultipleChoice && 'Multiple choice • '}
              Updated {formatDate(poll.updatedAt)}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/polls/${poll.id}`}>View Poll</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">
                <Link
                  href={`/polls/${poll.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {poll.title}
                </Link>
              </CardTitle>
              <Badge variant={getStatusColor(poll.status)}>
                {poll.status}
              </Badge>
            </div>
            {poll.description && (
              <CardDescription className="text-base">
                {poll.description}
              </CardDescription>
            )}
          </div>
          {showActions && poll.isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Link href={`/polls/${poll.id}`}>View Details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href={`/polls/${poll.id}/edit`}>Edit Poll</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Delete Poll
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-1" />
            <span>{poll.votes} votes</span>
          </div>
          <div className="flex items-center text-gray-600">
            <BarChart3 className="w-4 h-4 mr-1" />
            <span>{poll.views} views</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Created {formatDate(poll.createdAt)}</span>
          </div>
          {poll.endDate && (
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              <span>
                {poll.status === 'active'
                  ? getTimeRemaining(poll.endDate)
                  : `Ended ${formatDate(poll.endDate)}`
                }
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{poll.category}</Badge>
            <span className="text-sm text-gray-600">{poll.responses} options</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/polls/${poll.id}`}>View Poll</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
