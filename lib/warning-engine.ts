import type { Transaction, Warning, WarningType } from './types'
import { SUBSCRIPTION_SERVICES } from './sms-parser'

interface WarningGeneratorResult {
  type: WarningType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data?: Record<string, unknown>
}

export function generateWarnings(
  transactions: Transaction[],
  existingWarnings: Warning[] = []
): WarningGeneratorResult[] {
  const warnings: WarningGeneratorResult[] = []
  
  // Get dismissed warning types to avoid regenerating
  const dismissedTypes = new Set(
    existingWarnings.filter(w => w.dismissed).map(w => w.type)
  )

  // Run all warning checks
  const overspendingWarning = checkOverspending(transactions)
  if (overspendingWarning && !dismissedTypes.has('overspending')) {
    warnings.push(overspendingWarning)
  }

  const burnRateWarning = checkBurnRate(transactions)
  if (burnRateWarning && !dismissedTypes.has('burn_rate')) {
    warnings.push(burnRateWarning)
  }

  const subscriptionWarnings = checkSubscriptionLeaks(transactions)
  for (const warning of subscriptionWarnings) {
    if (!dismissedTypes.has('subscription_leak')) {
      warnings.push(warning)
    }
  }

  const duplicateWarnings = checkDuplicateCharges(transactions)
  for (const warning of duplicateWarnings) {
    if (!dismissedTypes.has('duplicate_charge')) {
      warnings.push(warning)
    }
  }

  const unusualWarning = checkUnusualMerchant(transactions)
  if (unusualWarning && !dismissedTypes.has('unusual_merchant')) {
    warnings.push(unusualWarning)
  }

  const largeTransactionWarning = checkLargeTransactions(transactions)
  if (largeTransactionWarning && !dismissedTypes.has('large_transaction')) {
    warnings.push(largeTransactionWarning)
  }

  const lowBalanceWarning = checkLowBalance(transactions)
  if (lowBalanceWarning && !dismissedTypes.has('low_balance')) {
    warnings.push(lowBalanceWarning)
  }

  const weekendWarning = checkWeekendSplurge(transactions)
  if (weekendWarning && !dismissedTypes.has('weekend_splurge')) {
    warnings.push(weekendWarning)
  }

  const impulseWarning = checkImpulseSpending(transactions)
  if (impulseWarning && !dismissedTypes.has('impulse_spending')) {
    warnings.push(impulseWarning)
  }

  return warnings
}

function checkOverspending(transactions: Transaction[]): WarningGeneratorResult | null {
  const now = new Date()
  const thisMonth = transactions.filter(tx => {
    const txDate = new Date(tx.timestamp)
    return txDate.getMonth() === now.getMonth() && 
           txDate.getFullYear() === now.getFullYear() &&
           tx.type === 'debit'
  })

  const lastMonth = transactions.filter(tx => {
    const txDate = new Date(tx.timestamp)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
    return txDate.getMonth() === lastMonthDate.getMonth() && 
           txDate.getFullYear() === lastMonthDate.getFullYear() &&
           tx.type === 'debit'
  })

  const thisMonthTotal = thisMonth.reduce((sum, tx) => sum + tx.amount, 0)
  const lastMonthTotal = lastMonth.reduce((sum, tx) => sum + tx.amount, 0)

  if (lastMonthTotal === 0) return null

  // Day of month progress
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const expectedSpentRatio = dayOfMonth / daysInMonth

  const projectedSpending = thisMonthTotal / expectedSpentRatio
  const overspendRatio = projectedSpending / lastMonthTotal

  if (overspendRatio > 1.3) {
    return {
      type: 'overspending',
      severity: overspendRatio > 1.5 ? 'high' : 'medium',
      title: 'Overspending Alert',
      message: `You're on track to spend ${Math.round((overspendRatio - 1) * 100)}% more than last month. Current: ₹${thisMonthTotal.toLocaleString()}`,
      data: {
        thisMonthTotal,
        lastMonthTotal,
        projectedSpending,
        overspendRatio,
      },
    }
  }

  return null
}

function checkBurnRate(transactions: Transaction[]): WarningGeneratorResult | null {
  // Calculate average daily spending over last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentDebits = transactions.filter(tx => 
    tx.type === 'debit' && new Date(tx.timestamp) >= thirtyDaysAgo
  )

  if (recentDebits.length < 10) return null

  const totalSpent = recentDebits.reduce((sum, tx) => sum + tx.amount, 0)
  const avgDailySpend = totalSpent / 30

  // Check if there's a recent balance
  const sortedByDate = [...transactions]
    .filter(tx => tx.balance !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const latestBalance = sortedByDate[0]?.balance

  if (latestBalance && avgDailySpend > 0) {
    const daysUntilZero = latestBalance / avgDailySpend

    if (daysUntilZero < 7) {
      return {
        type: 'burn_rate',
        severity: 'critical',
        title: 'Critical: Low Runway',
        message: `At your current spending rate (₹${Math.round(avgDailySpend)}/day), your balance could run out in ${Math.round(daysUntilZero)} days.`,
        data: {
          avgDailySpend,
          latestBalance,
          daysUntilZero,
        },
      }
    } else if (daysUntilZero < 14) {
      return {
        type: 'burn_rate',
        severity: 'high',
        title: 'High Burn Rate Warning',
        message: `Your current spending rate could deplete your balance in ${Math.round(daysUntilZero)} days.`,
        data: {
          avgDailySpend,
          latestBalance,
          daysUntilZero,
        },
      }
    }
  }

  return null
}

function checkSubscriptionLeaks(transactions: Transaction[]): WarningGeneratorResult[] {
  const warnings: WarningGeneratorResult[] = []
  const subscriptionTx = new Map<string, Transaction[]>()

  // Find subscription-related transactions
  for (const tx of transactions) {
    if (tx.type !== 'debit') continue
    
    const merchantLower = (tx.merchant || tx.normalized_merchant || '').toLowerCase()
    
    for (const service of SUBSCRIPTION_SERVICES) {
      if (merchantLower.includes(service.toLowerCase())) {
        const existing = subscriptionTx.get(service) || []
        existing.push(tx)
        subscriptionTx.set(service, existing)
        break
      }
    }
  }

  // Check for duplicate subscriptions or unusual patterns
  for (const [service, txList] of subscriptionTx.entries()) {
    // More than 2 charges in a month could indicate duplicate subscriptions
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const recentCharges = txList.filter(tx => new Date(tx.timestamp) >= lastMonth)
    
    if (recentCharges.length > 2) {
      const totalCharged = recentCharges.reduce((sum, tx) => sum + tx.amount, 0)
      warnings.push({
        type: 'subscription_leak',
        severity: 'medium',
        title: `Multiple ${service} Charges`,
        message: `You've been charged ${recentCharges.length} times (₹${totalCharged.toLocaleString()}) for ${service} in the last month. Check for duplicate subscriptions.`,
        data: {
          service,
          chargeCount: recentCharges.length,
          totalCharged,
        },
      })
    }
  }

  return warnings
}

function checkDuplicateCharges(transactions: Transaction[]): WarningGeneratorResult[] {
  const warnings: WarningGeneratorResult[] = []
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentDebits = transactions.filter(tx => 
    tx.type === 'debit' && new Date(tx.timestamp) >= sevenDaysAgo
  )

  // Group by merchant and amount
  const chargeGroups = new Map<string, Transaction[]>()
  
  for (const tx of recentDebits) {
    const merchant = tx.normalized_merchant || tx.merchant || 'Unknown'
    const key = `${merchant}-${tx.amount}`
    const existing = chargeGroups.get(key) || []
    existing.push(tx)
    chargeGroups.set(key, existing)
  }

  for (const [key, txList] of chargeGroups.entries()) {
    if (txList.length >= 2) {
      const [merchant] = key.split('-')
      const amount = txList[0].amount
      
      // Check if charges are within 24 hours of each other
      const sorted = txList.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      
      for (let i = 1; i < sorted.length; i++) {
        const timeDiff = new Date(sorted[i].timestamp).getTime() - 
                        new Date(sorted[i-1].timestamp).getTime()
        const hoursDiff = timeDiff / (1000 * 60 * 60)
        
        if (hoursDiff < 24) {
          warnings.push({
            type: 'duplicate_charge',
            severity: 'high',
            title: 'Potential Duplicate Charge',
            message: `Two identical charges of ₹${amount.toLocaleString()} at ${merchant} within ${Math.round(hoursDiff)} hours.`,
            data: {
              merchant,
              amount,
              hoursDiff,
              transactionIds: txList.map(tx => tx.id),
            },
          })
          break
        }
      }
    }
  }

  return warnings
}

function checkUnusualMerchant(transactions: Transaction[]): WarningGeneratorResult | null {
  const merchantFrequency = new Map<string, number>()
  
  for (const tx of transactions) {
    if (tx.type !== 'debit') continue
    const merchant = tx.normalized_merchant || tx.merchant
    if (!merchant) continue
    merchantFrequency.set(merchant, (merchantFrequency.get(merchant) || 0) + 1)
  }

  // Find merchants with only one transaction and high amount
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentDebits = transactions.filter(tx => 
    tx.type === 'debit' && new Date(tx.timestamp) >= sevenDaysAgo
  )

  for (const tx of recentDebits) {
    const merchant = tx.normalized_merchant || tx.merchant
    if (!merchant) continue
    
    const frequency = merchantFrequency.get(merchant) || 0
    const avgTransaction = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0) / 
      transactions.filter(t => t.type === 'debit').length

    // First-time merchant with amount 3x higher than average
    if (frequency === 1 && tx.amount > avgTransaction * 3) {
      return {
        type: 'unusual_merchant',
        severity: 'medium',
        title: 'Unusual Transaction Detected',
        message: `First-time transaction of ₹${tx.amount.toLocaleString()} at ${merchant}. This is ${Math.round(tx.amount / avgTransaction)}x your average transaction.`,
        data: {
          merchant,
          amount: tx.amount,
          avgTransaction,
          transactionId: tx.id,
        },
      }
    }
  }

  return null
}

function checkLargeTransactions(transactions: Transaction[]): WarningGeneratorResult | null {
  const debits = transactions.filter(tx => tx.type === 'debit')
  if (debits.length < 5) return null

  const amounts = debits.map(tx => tx.amount)
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
  const stdDev = Math.sqrt(variance)

  // Check recent transactions for outliers (more than 2 std devs)
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const recentLarge = debits.filter(tx => {
    const isRecent = new Date(tx.timestamp) >= oneDayAgo
    const isOutlier = tx.amount > mean + (2 * stdDev)
    return isRecent && isOutlier
  })

  if (recentLarge.length > 0) {
    const largest = recentLarge.reduce((a, b) => a.amount > b.amount ? a : b)
    return {
      type: 'large_transaction',
      severity: 'medium',
      title: 'Large Transaction Alert',
      message: `₹${largest.amount.toLocaleString()} spent at ${largest.merchant || 'Unknown'} - this is significantly above your typical spending.`,
      data: {
        amount: largest.amount,
        merchant: largest.merchant,
        mean,
        stdDev,
        transactionId: largest.id,
      },
    }
  }

  return null
}

function checkLowBalance(transactions: Transaction[]): WarningGeneratorResult | null {
  // Find the most recent balance
  const withBalance = transactions
    .filter(tx => tx.balance !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (withBalance.length === 0) return null

  const latestBalance = withBalance[0].balance!
  
  // Get average monthly spending
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const monthlySpending = transactions
    .filter(tx => tx.type === 'debit' && new Date(tx.timestamp) >= thirtyDaysAgo)
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Warn if balance is less than 10 days of average spending
  const avgDailySpend = monthlySpending / 30
  const daysOfSpending = latestBalance / avgDailySpend

  if (daysOfSpending < 10 && latestBalance < 10000) {
    return {
      type: 'low_balance',
      severity: latestBalance < 5000 ? 'high' : 'medium',
      title: 'Low Balance Warning',
      message: `Your balance of ₹${latestBalance.toLocaleString()} covers only ${Math.round(daysOfSpending)} days at your current spending rate.`,
      data: {
        balance: latestBalance,
        avgDailySpend,
        daysOfSpending,
      },
    }
  }

  return null
}

function checkWeekendSplurge(transactions: Transaction[]): WarningGeneratorResult | null {
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  const recentDebits = transactions.filter(tx => 
    tx.type === 'debit' && new Date(tx.timestamp) >= fourWeeksAgo
  )

  if (recentDebits.length < 10) return null

  let weekendSpending = 0
  let weekdaySpending = 0
  let weekendDays = 0
  let weekdayDays = 0

  for (const tx of recentDebits) {
    const day = new Date(tx.timestamp).getDay()
    if (day === 0 || day === 6) {
      weekendSpending += tx.amount
      weekendDays++
    } else {
      weekdaySpending += tx.amount
      weekdayDays++
    }
  }

  const avgWeekendDaily = weekendDays > 0 ? weekendSpending / weekendDays : 0
  const avgWeekdayDaily = weekdayDays > 0 ? weekdaySpending / weekdayDays : 0

  if (avgWeekdayDaily > 0 && avgWeekendDaily > avgWeekdayDaily * 1.5) {
    return {
      type: 'weekend_splurge',
      severity: 'low',
      title: 'Weekend Spending Spike',
      message: `You spend ${Math.round((avgWeekendDaily / avgWeekdayDaily - 1) * 100)}% more on weekends. Consider setting a weekend budget.`,
      data: {
        avgWeekendDaily,
        avgWeekdayDaily,
        weekendTotal: weekendSpending,
        weekdayTotal: weekdaySpending,
      },
    }
  }

  return null
}

function checkImpulseSpending(transactions: Transaction[]): WarningGeneratorResult | null {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentDebits = transactions.filter(tx => 
    tx.type === 'debit' && new Date(tx.timestamp) >= sevenDaysAgo
  )

  // Count late night transactions (10 PM - 2 AM) in food/entertainment
  const impulseCategories = ['Food & Dining', 'Entertainment', 'Shopping']
  
  let lateNightCount = 0
  let lateNightTotal = 0

  for (const tx of recentDebits) {
    const hour = new Date(tx.timestamp).getHours()
    const isLateNight = hour >= 22 || hour <= 2
    const isImpulseCategory = impulseCategories.includes(tx.category || '')

    if (isLateNight && isImpulseCategory) {
      lateNightCount++
      lateNightTotal += tx.amount
    }
  }

  if (lateNightCount >= 3 && lateNightTotal > 1000) {
    return {
      type: 'impulse_spending',
      severity: 'low',
      title: 'Late Night Spending Pattern',
      message: `${lateNightCount} late-night purchases totaling ₹${lateNightTotal.toLocaleString()} this week. These often lead to regret!`,
      data: {
        count: lateNightCount,
        total: lateNightTotal,
      },
    }
  }

  return null
}

export function getWarningSeverityColor(severity: Warning['severity']): string {
  switch (severity) {
    case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20'
    case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
    case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
    case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    default: return 'text-muted-foreground bg-muted border-border'
  }
}

export function getWarningIcon(type: WarningType): string {
  const icons: Record<WarningType, string> = {
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
