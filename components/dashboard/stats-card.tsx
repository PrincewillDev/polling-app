'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = 'default'
}: StatsCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'danger':
        return 'border-red-200 bg-red-50'
      default:
        return ''
    }
  }

  const getTrendColor = (isPositive: boolean) => {
    return isPositive ? 'text-green-600' : 'text-red-600'
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // Format large numbers with commas
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M'
      }
      if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K'
      }
      return val.toLocaleString()
    }
    return val
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow', getVariantClasses(), className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            variant === 'success' && 'bg-green-100',
            variant === 'warning' && 'bg-yellow-100',
            variant === 'danger' && 'bg-red-100',
            variant === 'default' && 'bg-gray-100'
          )}>
            <Icon className={cn(
              'h-4 w-4',
              variant === 'success' && 'text-green-600',
              variant === 'warning' && 'text-yellow-600',
              variant === 'danger' && 'text-red-600',
              variant === 'default' && 'text-gray-600'
            )} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold text-gray-900">
            {formatValue(value)}
          </div>
          {trend && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs border-0 bg-transparent px-0',
                getTrendColor(trend.isPositive)
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% {trend.label}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default StatsCard
