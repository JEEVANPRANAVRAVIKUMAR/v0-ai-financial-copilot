import { createClient } from '@/lib/supabase/server'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { StatCard } from '@/components/dashboard/stat-card'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { WarningsList } from '@/components/dashboard/warnings-list'
import { SpendingChart, CategoryChart } from '@/components/dashboard/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calculateBehaviorScore } from '@/lib/scoring-engine'
import { generateWarnings } from '@/lib/warning-engine'
import { ArrowRight, TrendingDown, TrendingUp, Wallet, Receipt } from 'lucide-react'
import Link from 'next/link'
import type { Transaction, Warning } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('timestamp', { ascending: false })
    .limit(100)

  const txList = (transactions || []) as Transaction[]

  // Fetch existing warnings
  const { data: existingWarnings } = await supabase
    .from('warnings')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  // Calculate score
  const scoreResult = calculateBehaviorScore(txList)

  // Fetch previous score for comparison
  const { data: previousScores } = await supabase
    .from('behavior_scores')
    .select('score')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(2)

  const previousScore = previousScores && previousScores.length > 1 
    ? previousScores[1].score 
    : undefined

  // Generate new warnings
  const generatedWarnings = generateWarnings(txList, existingWarnings as Warning[] || [])
  
  // Combine existing and new warnings for display
  const allWarnings = [
    ...(existingWarnings || []),
    ...generatedWarnings.map((w, i) => ({
      ...w,
      id: `new-${i}`,
      user_id: user!.id,
      dismissed: false,
      created_at: new Date().toISOString(),
    })),
  ] as Warning[]

  // Calculate stats
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const thisMonthTx = txList.filter(tx => new Date(tx.timestamp) >= thisMonthStart)
  const totalSpent = thisMonthTx
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const totalIncome = thisMonthTx
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Get latest balance
  const withBalance = txList.filter(tx => tx.balance !== null)
  const currentBalance = withBalance.length > 0 ? withBalance[0].balance : null

  // Calculate category breakdown
  const categoryMap = new Map<string, number>()
  thisMonthTx
    .filter(tx => tx.type === 'debit')
    .forEach(tx => {
      const cat = tx.category || 'Other'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + tx.amount)
    })

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
      count: thisMonthTx.filter(tx => tx.category === category).length,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Calculate weekly data
  const weeklyData = calculateWeeklyData(txList)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance</p>
      </div>

      {/* Score and Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-1 lg:row-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Behavior Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ScoreGauge score={scoreResult.score} previousScore={previousScore} size="md" />
            <Link href="/dashboard/score" className="mt-4">
              <Button variant="outline" size="sm">
                View Details <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <StatCard
          title="Monthly Spending"
          value={`₹${totalSpent.toLocaleString()}`}
          subtitle="This month"
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
        />
        <StatCard
          title="Monthly Income"
          value={`₹${totalIncome.toLocaleString()}`}
          subtitle="This month"
          icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          title="Current Balance"
          value={currentBalance !== null ? `₹${currentBalance.toLocaleString()}` : 'N/A'}
          subtitle="Last known balance"
          icon={<Wallet className="w-5 h-5 text-primary" />}
        />
        <StatCard
          title="Transactions"
          value={thisMonthTx.length}
          subtitle="This month"
          icon={<Receipt className="w-5 h-5 text-muted-foreground" />}
        />
      </div>

      {/* Charts and Warnings Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SpendingChart data={weeklyData} />
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Warnings</CardTitle>
            <Link href="/dashboard/warnings">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <WarningsList warnings={allWarnings} limit={3} compact />
          </CardContent>
        </Card>
      </div>

      {/* Category and Transactions Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <CategoryChart data={categoryData} />
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <TransactionList transactions={txList.slice(0, 5)} />
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {scoreResult.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {scoreResult.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-sm text-foreground">{insight}</p>
                </div>
              ))}
              {scoreResult.recommendations.map((rec, i) => (
                <div key={`rec-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-primary/10">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-sm text-foreground">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function calculateWeeklyData(transactions: Transaction[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekData = new Map<number, { spent: number; income: number }>()

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    weekData.set(i, { spent: 0, income: 0 })
  }

  // Get last 7 days of transactions
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  transactions
    .filter(tx => new Date(tx.timestamp) >= sevenDaysAgo)
    .forEach(tx => {
      const day = new Date(tx.timestamp).getDay()
      const current = weekData.get(day)!
      if (tx.type === 'debit') {
        current.spent += tx.amount
      } else {
        current.income += tx.amount
      }
    })

  // Convert to array starting from today and going back
  const today = new Date().getDay()
  const result = []
  for (let i = 6; i >= 0; i--) {
    const dayIndex = (today - i + 7) % 7
    const data = weekData.get(dayIndex)!
    result.push({
      day: days[dayIndex],
      spent: data.spent,
      income: data.income,
    })
  }

  return result
}
