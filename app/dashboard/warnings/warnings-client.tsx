'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WarningCard } from '@/components/dashboard/warnings-list'
import type { Warning } from '@/lib/types'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface WarningsClientProps {
  initialWarnings: Warning[]
  userId: string
}

export function WarningsClient({ initialWarnings, userId }: WarningsClientProps) {
  const [warnings, setWarnings] = useState(initialWarnings)
  const [filter, setFilter] = useState<'active' | 'dismissed' | 'all'>('active')
  const router = useRouter()

  const filteredWarnings = warnings.filter(w => {
    if (filter === 'active') return !w.dismissed
    if (filter === 'dismissed') return w.dismissed
    return true
  })

  const handleDismiss = async (warningId: string) => {
    const supabase = createClient()
    
    // Check if it's a real warning (has proper UUID)
    if (warningId.startsWith('new-')) {
      // Save the new warning as dismissed
      const warning = warnings.find(w => w.id === warningId)
      if (warning) {
        await supabase.from('warnings').insert({
          user_id: userId,
          type: warning.type,
          severity: warning.severity,
          title: warning.title,
          message: warning.message,
          data: warning.data,
          dismissed: true,
        })
      }
    } else {
      // Update existing warning
      await supabase
        .from('warnings')
        .update({ dismissed: true })
        .eq('id', warningId)
    }

    setWarnings(prev => 
      prev.map(w => w.id === warningId ? { ...w, dismissed: true } : w)
    )
    router.refresh()
  }

  const severityCounts = {
    critical: warnings.filter(w => w.severity === 'critical' && !w.dismissed).length,
    high: warnings.filter(w => w.severity === 'high' && !w.dismissed).length,
    medium: warnings.filter(w => w.severity === 'medium' && !w.dismissed).length,
    low: warnings.filter(w => w.severity === 'low' && !w.dismissed).length,
  }

  const activeCount = warnings.filter(w => !w.dismissed).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Warnings</h1>
        <p className="text-muted-foreground">
          {activeCount} active warning{activeCount !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className={severityCounts.critical > 0 ? 'border-red-500/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{severityCounts.critical}</p>
          </CardContent>
        </Card>
        <Card className={severityCounts.high > 0 ? 'border-orange-500/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <p className="text-sm text-muted-foreground">High</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{severityCounts.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <p className="text-sm text-muted-foreground">Medium</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{severityCounts.medium}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <p className="text-sm text-muted-foreground">Low</p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{severityCounts.low}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Active ({warnings.filter(w => !w.dismissed).length})
        </Button>
        <Button
          variant={filter === 'dismissed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('dismissed')}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Dismissed ({warnings.filter(w => w.dismissed).length})
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({warnings.length})
        </Button>
      </div>

      {/* Warnings List */}
      {filteredWarnings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              {filter === 'active' ? 'No Active Warnings' : 'No Warnings Found'}
            </h3>
            <p className="text-muted-foreground mt-1">
              {filter === 'active' 
                ? 'Great job! Your finances look healthy.'
                : 'No warnings match the current filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredWarnings.map(warning => (
            <WarningCard
              key={warning.id}
              warning={warning}
              onDismiss={!warning.dismissed ? handleDismiss : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
