'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, BarChart3, Users, Calendar, Eye } from 'lucide-react'
import { pollsAPI } from '@/lib/api/polls'
import { Poll } from '@/types'

const CATEGORIES = [
  'All',
  'Technology',
  'Business',
  'Entertainment',
  'Sports',
  'Politics',
  'Education',
  'Food & Drink',
  'Travel',
  'Health & Fitness',
  'Lifestyle',
  'Science',
  'Art & Culture',
  'Gaming',
  'Music',
  'Movies & TV',
  'Books',
  'Fashion',
  'General',
]

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('created_at')

  const fetchPolls = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const filters: Record<string, string> = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (selectedCategory !== 'All') filters.category = selectedCategory
      if (searchQuery) filters.search = searchQuery
      filters.sortBy = sortBy

      const response = await pollsAPI.getPolls(filters)
      
      if (response.success && response.data) {
        setPolls(response.data)
      } else {
        console.error('Failed to fetch polls:', response.error)
      }
    } catch (error) {
      console.error('Error fetching polls:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory, statusFilter, searchQuery, sortBy])

  useEffect(() => {
    fetchPolls()
  }, [fetchPolls])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Polls</h1>
          <p className="text-gray-600 mt-2">
            Discover and participate in polls from the community
          </p>
        </div>
        <Button asChild className="mt-4 sm:mt-0">
          <Link href="/polls/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="total_votes">Most Votes</SelectItem>
            <SelectItem value="total_views">Most Views</SelectItem>
            <SelectItem value="title">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Polls</p>
                <p className="text-xl font-bold">{polls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Votes</p>
                <p className="text-xl font-bold">
                  {polls.reduce((sum, poll) => sum + poll.totalVotes, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Eye className="h-5 w-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total Views</p>
                <p className="text-xl font-bold">
                  {polls.reduce((sum, poll) => sum + poll.totalViews, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Polls Grid */}
      {polls.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No polls found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedCategory !== 'All' || statusFilter !== 'active'
                ? 'Try adjusting your filters to see more results'
                : 'Be the first to create a poll!'}
            </p>
            <Button asChild>
              <Link href="/polls/create">
                <Plus className="h-4 w-4 mr-2" />
                Create First Poll
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <Card key={poll.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{poll.category}</Badge>
                  <Badge className={getStatusColor(poll.status)}>
                    {poll.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2">
                  <Link href={`/polls/${poll.id}`} className="hover:text-blue-600">
                    {poll.title}
                  </Link>
                </CardTitle>
                {poll.description && (
                  <CardDescription className="line-clamp-2">
                    {poll.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                {/* Options Preview */}
                <div className="space-y-2 mb-4">
                  {poll.options.slice(0, 3).map((option, index) => (
                    <div key={option.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate flex-1">
                        {index + 1}. {option.text}
                      </span>
                      <span className="text-gray-500 ml-2">{option.votes}</span>
                    </div>
                  ))}
                  {poll.options.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{poll.options.length - 3} more options
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {poll.totalVotes}
                    </span>
                    <span className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {poll.totalViews}
                    </span>
                  </div>
                  <span className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(poll.createdAt)}
                  </span>
                </div>

                {/* Tags */}
                {poll.tags && poll.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {poll.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {poll.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{poll.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Author */}
                {poll.createdBy && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span>by {poll.createdBy.name}</span>
                  </div>
                )}

                {/* End Date */}
                {poll.endDate && (
                  <div className="mt-2 text-xs text-orange-600">
                    Ends: {formatDate(poll.endDate)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
