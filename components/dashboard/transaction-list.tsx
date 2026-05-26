'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

interface TransactionItemProps {
  transaction: Transaction
  showDate?: boolean
}

export function TransactionItem({ transaction, showDate = true }: TransactionItemProps) {
  const isDebit = transaction.type === 'debit'
  
  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-muted/50 rounded-lg transition-colors">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          isDebit ? 'bg-red-500/10' : 'bg-emerald-500/10'
        )}
      >
        {isDebit ? (
          <ArrowUpRight className="w-5 h-5 text-red-500" />
        ) : (
          <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">
          {transaction.normalized_merchant || transaction.merchant || 'Unknown'}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{transaction.category || 'Uncategorized'}</span>
          {showDate && (
            <>
              <span>•</span>
              <span className="shrink-0">
                {formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>
      
      <div className="text-right shrink-0">
        <p
          className={cn(
            'font-semibold',
            isDebit ? 'text-red-500' : 'text-emerald-500'
          )}
        >
          {isDebit ? '-' : '+'}₹{transaction.amount.toLocaleString()}
        </p>
        {transaction.balance !== null && (
          <p className="text-xs text-muted-foreground">
            Bal: ₹{transaction.balance.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

interface TransactionListProps {
  transactions: Transaction[]
  showGroupedByDate?: boolean
  emptyMessage?: string
}

export function TransactionList({ 
  transactions, 
  showGroupedByDate = false,
  emptyMessage = 'No transactions yet'
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  if (!showGroupedByDate) {
    return (
      <div className="divide-y divide-border">
        {transactions.map((tx) => (
          <TransactionItem key={tx.id} transaction={tx} />
        ))}
      </div>
    )
  }

  // Group by date
  const grouped = transactions.reduce((acc, tx) => {
    const date = format(new Date(tx.timestamp), 'yyyy-MM-dd')
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(tx)
    return acc
  }, {} as Record<string, Transaction[]>)

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-4">
            {format(new Date(date), 'EEEE, MMMM d')}
          </h3>
          <div className="divide-y divide-border">
            {txs.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} showDate={false} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
