import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SpendingChart, CategoryChart, ScoreDimensionsChart } from '@/components/dashboard/charts'
import { calculateBehaviorScore } from '@/lib/scoring-engine'
import type { Transaction } from '@/lib/types'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('timestamp', { ascending: false })

  const txList = (transactions || []) as Transaction[]
  const scoreResult = calculateBehaviorScore(txList)

  // Calculate monthly spending trends
  const monthlyData = calculateMonthlyTrends(txList)

  // Calculate weekly data
  const weeklyData = calculateWeeklyData(txList)

  // Calculate category breakdown
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthTx = txList.filter(tx => new Date(tx.timestamp) >= thisMonthStart)
  
  const categoryMap = new Map<string, number>()
  const totalSpent = thisMonthTx
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => {
      const cat = tx.category || 'Other'
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + tx.amount)
      return sum + tx.amount
    }, 0)

  const categoryData = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Score dimensions for chart
  const scoreDimensionsData = [
    { name: 'Consistency', value: scoreResult.dimensions.consistency },
    { name: 'Impulse Control', value: scoreResult.dimensions.impulseControl },
    { name: 'Savings Rate', value: scoreResult.dimensions.savingsRate },
    { name: 'Bill Discipline', value: scoreResult.dimensions.billDiscipline },
    { name: 'Category Balance', value: scoreResult.dimensions.categoryBalance },
  ]

  // Calculate average transaction
  const debits = txList.filter(tx => tx.type === 'debit')
  const avgTransaction = debits.length > 0 
    ? debits.reduce((sum, tx) => sum + tx.amount, 0) / debits.length 
    : 0

  // Top merchants
  const merchantMap = new Map<string, { count: number; amount: number }>()
  debits.forEach(tx => {
    const merchant = tx.normalized_merchant || tx.merchant || 'Unknown'
    const current = merchantMap.get(merchant) || { count: 0, amount: 0 }
    merchantMap.set(merchant, {
      count: current.count + 1,
      amount: current.amount + tx.amount,
    })
  })
  const topMerchants = Array.from(merchantMap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Deep dive into your spending patterns</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Transaction</p>
            <p className="text-2xl font-bold text-foreground">
              ₹{avgTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold text-foreground">{txList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unique Merchants</p>
            <p className="text-2xl font-bold text-foreground">{merchantMap.size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Categories Used</p>
            <p className="text-2xl font-bold text-foreground">{categoryMap.size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SpendingChart data={weeklyData} />
        <CategoryChart data={categoryData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreDimensionsChart data={scoreDimensionsData} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-12">{month.month}</span>
                  <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden flex">
                    <div
                      className="bg-red-500/80 h-full transition-all"
                      style={{ width: `${(month.spent / Math.max(...monthlyData.map(m => m.spent + m.income))) * 100}%` }}
                    />
                    <div
                      className="bg-emerald-500/80 h-full transition-all"
                      style={{ width: `${(month.income / Math.max(...monthlyData.map(m => m.spent + m.income))) * 100}%` }}
                    />
                  </div>
                  <div className="text-right text-sm min-w-[100px]">
                    <span className="text-red-500">-₹{(month.spent / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-emerald-500">+₹{(month.income / 1000).toFixed(1)}k</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Merchants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Merchants by Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topMerchants.map(([merchant, data], index) => (
              <div key={merchant} className="flex items-center gap-4">
                <span className="text-lg font-bold text-muted-foreground w-6">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{merchant}</p>
                  <p className="text-sm text-muted-foreground">{data.count} transactions</p>
                </div>
                <p className="font-semibold text-foreground">
                  ₹{data.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateWeeklyData(transactions: Transaction[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekData = new Map<number, { spent: number; income: number }>()

  for (let i = 0; i < 7; i++) {
    weekData.set(i, { spent: 0, income: 0 })
  }

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

function calculateMonthlyTrends(transactions: Transaction[]) {
  const months: { month: string; spent: number; income: number }[] = []
  
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i)
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)
    
    const monthTx = transactions.filter(tx => {
      const date = new Date(tx.timestamp)
      return date >= start && date <= end
    })

    months.push({
      month: format(monthDate, 'MMM'),
      spent: monthTx.filter(tx => tx.type === 'debit').reduce((sum, tx) => sum + tx.amount, 0),
      income: monthTx.filter(tx => tx.type === 'credit').reduce((sum, tx) => sum + tx.amount, 0),
    })
  }

  return months
}
