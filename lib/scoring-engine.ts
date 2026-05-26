import type { Transaction, ScoreCalculation, ScoreDimensions } from './types'

// Score ranges and weights
const SCORE_WEIGHTS = {
  consistency: 0.25,
  impulseControl: 0.20,
  savingsRate: 0.25,
  billDiscipline: 0.15,
  categoryBalance: 0.15,
}

const MAX_SCORE = 850
const MIN_SCORE = 0

export function calculateBehaviorScore(transactions: Transaction[]): ScoreCalculation {
  if (transactions.length === 0) {
    return {
      score: 500, // Default starting score
      dimensions: {
        consistency: 50,
        impulseControl: 50,
        savingsRate: 50,
        billDiscipline: 50,
        categoryBalance: 50,
      },
      insights: ['Start tracking your transactions to see your score improve!'],
      recommendations: ['Import your bank SMS messages to get started'],
    }
  }

  const dimensions = {
    consistency: calculateConsistencyScore(transactions),
    impulseControl: calculateImpulseControlScore(transactions),
    savingsRate: calculateSavingsRateScore(transactions),
    billDiscipline: calculateBillDisciplineScore(transactions),
    categoryBalance: calculateCategoryBalanceScore(transactions),
  }

  // Calculate weighted score
  let weightedScore = 0
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    weightedScore += dimensions[key as keyof ScoreDimensions] * weight
  }

  // Scale to 0-850
  const score = Math.round((weightedScore / 100) * MAX_SCORE)
  const clampedScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, score))

  const insights = generateInsights(dimensions, transactions)
  const recommendations = generateRecommendations(dimensions)

  return {
    score: clampedScore,
    dimensions,
    insights,
    recommendations,
  }
}

function calculateConsistencyScore(transactions: Transaction[]): number {
  // Measure spending consistency day-over-day
  const dailySpending = new Map<string, number>()
  
  for (const tx of transactions) {
    if (tx.type === 'debit') {
      const date = new Date(tx.timestamp).toISOString().split('T')[0]
      dailySpending.set(date, (dailySpending.get(date) || 0) + tx.amount)
    }
  }

  if (dailySpending.size < 2) return 50

  const values = Array.from(dailySpending.values())
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1

  // Lower CV = more consistent = higher score
  // CV of 0.5 or less = excellent, CV of 2+ = poor
  const score = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 40)))
  return Math.round(score)
}

function calculateImpulseControlScore(transactions: Transaction[]): number {
  const debits = transactions.filter(tx => tx.type === 'debit')
  if (debits.length === 0) return 50

  // Factors for impulse control:
  // 1. Late night transactions (after 10 PM)
  // 2. Weekend spending spikes
  // 3. Multiple small transactions in quick succession
  
  let impulseIndicators = 0
  let totalTransactions = debits.length

  for (const tx of debits) {
    const date = new Date(tx.timestamp)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()

    // Late night (10 PM - 2 AM)
    if (hour >= 22 || hour <= 2) {
      impulseIndicators += 0.5
    }

    // Weekend (Saturday & Sunday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      impulseIndicators += 0.2
    }

    // Small impulse purchases (food delivery, quick buys)
    if (tx.amount < 500 && 
        (tx.category === 'Food & Dining' || tx.category === 'Entertainment')) {
      impulseIndicators += 0.3
    }
  }

  const impulseRatio = impulseIndicators / totalTransactions
  const score = Math.max(0, Math.min(100, 100 - (impulseRatio * 60)))
  return Math.round(score)
}

function calculateSavingsRateScore(transactions: Transaction[]): number {
  const totalIncome = transactions
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalSpending = transactions
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + tx.amount, 0)

  if (totalIncome === 0) {
    // No income tracked - use spending patterns
    return 50
  }

  const savingsRate = (totalIncome - totalSpending) / totalIncome
  
  // Scoring based on savings rate:
  // 30%+ = 100, 20-30% = 80-100, 10-20% = 60-80, 0-10% = 40-60, negative = 0-40
  if (savingsRate >= 0.30) return 100
  if (savingsRate >= 0.20) return 80 + (savingsRate - 0.20) * 200
  if (savingsRate >= 0.10) return 60 + (savingsRate - 0.10) * 200
  if (savingsRate >= 0) return 40 + savingsRate * 200
  return Math.max(0, 40 + savingsRate * 100) // Negative savings
}

function calculateBillDisciplineScore(transactions: Transaction[]): number {
  const billCategories = ['Bills & Utilities', 'Investment']
  const billTransactions = transactions.filter(
    tx => tx.type === 'debit' && billCategories.includes(tx.category || '')
  )

  if (billTransactions.length === 0) return 50

  // Check regularity of bill payments
  const monthlyBills = new Map<string, number>()
  
  for (const tx of billTransactions) {
    const month = new Date(tx.timestamp).toISOString().slice(0, 7)
    monthlyBills.set(month, (monthlyBills.get(month) || 0) + 1)
  }

  // More regular monthly bills = higher score
  const monthCount = monthlyBills.size
  const avgBillsPerMonth = billTransactions.length / Math.max(1, monthCount)
  
  // Score based on regularity
  const score = Math.min(100, avgBillsPerMonth * 20 + 40)
  return Math.round(score)
}

function calculateCategoryBalanceScore(transactions: Transaction[]): number {
  const debits = transactions.filter(tx => tx.type === 'debit')
  if (debits.length === 0) return 50

  const categoryTotals = new Map<string, number>()
  let totalSpent = 0

  for (const tx of debits) {
    const category = tx.category || 'Other'
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + tx.amount)
    totalSpent += tx.amount
  }

  if (totalSpent === 0) return 50

  // Ideal distribution (rough approximation)
  const idealDistribution: Record<string, number> = {
    'Food & Dining': 0.25,
    'Shopping': 0.15,
    'Transport': 0.10,
    'Bills & Utilities': 0.20,
    'Entertainment': 0.10,
    'Health': 0.05,
    'Education': 0.05,
    'Investment': 0.10,
  }

  let deviationScore = 0
  let categoriesEvaluated = 0

  for (const [category, ideal] of Object.entries(idealDistribution)) {
    const actual = (categoryTotals.get(category) || 0) / totalSpent
    const deviation = Math.abs(actual - ideal)
    deviationScore += deviation
    categoriesEvaluated++
  }

  const avgDeviation = deviationScore / categoriesEvaluated
  const score = Math.max(0, Math.min(100, 100 - (avgDeviation * 200)))
  return Math.round(score)
}

function generateInsights(dimensions: ScoreDimensions, transactions: Transaction[]): string[] {
  const insights: string[] = []

  // Consistency insight
  if (dimensions.consistency >= 70) {
    insights.push('Your spending is consistent - great financial discipline!')
  } else if (dimensions.consistency < 40) {
    insights.push('Your spending varies significantly day-to-day')
  }

  // Impulse control insight
  if (dimensions.impulseControl >= 70) {
    insights.push('You show excellent control over impulse purchases')
  } else if (dimensions.impulseControl < 40) {
    insights.push('Consider reducing late-night and weekend impulse purchases')
  }

  // Savings insight
  if (dimensions.savingsRate >= 70) {
    insights.push('Excellent savings rate - you\'re building financial security')
  } else if (dimensions.savingsRate < 40) {
    insights.push('Your expenses are close to or exceeding your income')
  }

  // Category balance insight
  const debits = transactions.filter(tx => tx.type === 'debit')
  const foodSpending = debits
    .filter(tx => tx.category === 'Food & Dining')
    .reduce((sum, tx) => sum + tx.amount, 0)
  const totalSpending = debits.reduce((sum, tx) => sum + tx.amount, 0)

  if (totalSpending > 0 && foodSpending / totalSpending > 0.35) {
    insights.push('Food & dining takes up a large portion of your spending')
  }

  return insights.slice(0, 4) // Max 4 insights
}

function generateRecommendations(dimensions: ScoreDimensions): string[] {
  const recommendations: string[] = []

  if (dimensions.consistency < 50) {
    recommendations.push('Try setting a daily spending limit to improve consistency')
  }

  if (dimensions.impulseControl < 50) {
    recommendations.push('Wait 24 hours before making non-essential purchases')
  }

  if (dimensions.savingsRate < 50) {
    recommendations.push('Aim to save at least 20% of your income each month')
  }

  if (dimensions.billDiscipline < 50) {
    recommendations.push('Set up autopay for regular bills to avoid late fees')
  }

  if (dimensions.categoryBalance < 50) {
    recommendations.push('Review your spending categories and set budgets')
  }

  return recommendations.slice(0, 3) // Max 3 recommendations
}

export function getScoreRating(score: number): { label: string; color: string } {
  if (score >= 750) return { label: 'Excellent', color: 'text-emerald-500' }
  if (score >= 650) return { label: 'Good', color: 'text-green-500' }
  if (score >= 550) return { label: 'Fair', color: 'text-yellow-500' }
  if (score >= 450) return { label: 'Needs Work', color: 'text-orange-500' }
  return { label: 'Poor', color: 'text-red-500' }
}

export function getScoreChange(currentScore: number, previousScore: number): {
  change: number
  direction: 'up' | 'down' | 'stable'
  description: string
} {
  const change = currentScore - previousScore
  
  if (Math.abs(change) < 5) {
    return { change: 0, direction: 'stable', description: 'Score stable' }
  }
  
  if (change > 0) {
    return {
      change,
      direction: 'up',
      description: `Up ${change} points - great progress!`,
    }
  }
  
  return {
    change: Math.abs(change),
    direction: 'down',
    description: `Down ${Math.abs(change)} points - review your habits`,
  }
}
