'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Warning } from '@/lib/types'
import { getWarningSeverityColor } from '@/lib/warning-engine'
import {
  TrendingUp,
  Flame,
  Repeat,
  Copy,
  AlertTriangle,
  DollarSign,
  Wallet,
  Calendar,
  Zap,
  AlertCircle,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const iconMap: Record<string, React.ElementType> = {
  'trending-up': TrendingUp,
  flame: Flame,
  repeat: Repeat,
  copy: Copy,
  'alert-triangle': AlertTriangle,
  'dollar-sign': DollarSign,
  wallet: Wallet,
  calendar: Calendar,
  zap: Zap,
  'alert-circle': AlertCircle,
}

interface WarningCardProps {
  warning: Warning
  onDismiss?: (id: string) => void
  compact?: boolean
}

export function WarningCard({ warning, onDismiss, compact = false }: WarningCardProps) {
  const severityColors = getWarningSeverityColor(warning.severity)
  const iconName = getWarningIconName(warning.type)
  const Icon = iconMap[iconName] || AlertCircle

  if (compact) {
    return (
      <div className={cn('flex items-start gap-3 p-3 rounded-lg border', severityColors)}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{warning.title}</p>
          <p className="text-xs opacity-80 mt-0.5 line-clamp-2">{warning.message}</p>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-6 w-6"
            onClick={() => onDismiss(warning.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('border', severityColors)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <CardTitle className="text-base">{warning.title}</CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 -mt-1 -mr-2"
              onClick={() => onDismiss(warning.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm opacity-90">{warning.message}</p>
        <p className="text-xs opacity-60 mt-2">
          {formatDistanceToNow(new Date(warning.created_at), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  )
}

function getWarningIconName(type: Warning['type']): string {
  const icons: Record<string, string> = {
    overspending: 'trending-up',
    burn_rate: 'flame',
    subscription_leak: 'repeat',
    duplicate_charge: 'copy',
    unusual_merchant: 'alert-triangle',
    large_transaction: 'dollar-sign',
    low_balance: 'wallet',
    weekend_splurge: 'calendar',
    impulse_spending: 'zap',
  }
  return icons[type] || 'alert-circle'
}

interface WarningsListProps {
  warnings: Warning[]
  onDismiss?: (id: string) => void
  limit?: number
  compact?: boolean
}

export function WarningsList({ warnings, onDismiss, limit, compact = false }: WarningsListProps) {
  const activeWarnings = warnings.filter((w) => !w.dismissed)
  const displayWarnings = limit ? activeWarnings.slice(0, limit) : activeWarnings

  if (displayWarnings.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No active warnings</p>
        <p className="text-sm">Your finances look healthy!</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {displayWarnings.map((warning) => (
        <WarningCard
          key={warning.id}
          warning={warning}
          onDismiss={onDismiss}
          compact={compact}
        />
      ))}
    </div>
  )
}
