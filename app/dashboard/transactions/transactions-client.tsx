'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TransactionList } from '@/components/dashboard/transaction-list'
import type { Transaction } from '@/lib/types'
import { Search, Filter, Plus, Upload } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface TransactionsClientProps {
  initialTransactions: Transaction[]
}

const CATEGORIES = [
  'All Categories',
  'Food & Dining',
  'Shopping',
  'Transport',
  'Bills & Utilities',
  'Entertainment',
  'Health',
  'Education',
  'Investment',
  'Transfer',
  'ATM',
  'Other',
]

export function TransactionsClient({ initialTransactions }: TransactionsClientProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [type, setType] = useState<'all' | 'debit' | 'credit'>('all')

  const filteredTransactions = initialTransactions.filter(tx => {
    const matchesSearch = search === '' || 
      (tx.merchant?.toLowerCase().includes(search.toLowerCase())) ||
      (tx.normalized_merchant?.toLowerCase().includes(search.toLowerCase()))
    
    const matchesCategory = category === 'All Categories' || tx.category === category
    const matchesType = type === 'all' || tx.type === type

    return matchesSearch && matchesCategory && matchesType
  })

  const totalSpent = filteredTransactions
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0)
  
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">
            {filteredTransactions.length} transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/import">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import SMS
            </Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Manual
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search merchants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="debit">Expenses</SelectItem>
                <SelectItem value="credit">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold text-red-500">
              -₹{totalSpent.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-bold text-emerald-500">
              +₹{totalIncome.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionList 
            transactions={filteredTransactions} 
            showGroupedByDate
            emptyMessage="No transactions match your filters"
          />
        </CardContent>
      </Card>
    </div>
  )
}
