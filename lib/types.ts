// Database types
export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: 'debit' | 'credit'
  merchant: string | null
  normalized_merchant: string | null
  category: string | null
  timestamp: string
  balance: number | null
  source: string
  raw_message: string | null
  confidence: number | null
  bank_name: string | null
  upi_id: string | null
  created_at: string
}

export interface Warning {
  id: string
  user_id: string
  type: WarningType
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  data: Record<string, unknown> | null
  dismissed: boolean
  created_at: string
}

export type WarningType = 
  | 'overspending'
  | 'burn_rate'
  | 'subscription_leak'
  | 'duplicate_charge'
  | 'unusual_merchant'
  | 'large_transaction'
  | 'low_balance'
  | 'weekend_splurge'
  | 'impulse_spending'

export interface BehaviorScore {
  id: string
  user_id: string
  score: number
  dimensions: ScoreDimensions
  created_at: string
}

export interface ScoreDimensions {
  consistency: number
  impulseControl: number
  savingsRate: number
  billDiscipline: number
  categoryBalance: number
}

export interface Profile {
  id: string
  display_name: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// SMS Parser types
export interface ParsedTransaction {
  amount: number
  type: 'debit' | 'credit'
  merchant: string | null
  category: string | null
  timestamp: Date
  balance: number | null
  bankName: string | null
  upiId: string | null
  confidence: number
  rawMessage: string
}

export interface BankPattern {
  name: string
  patterns: RegExp[]
  amountPattern: RegExp
  merchantPattern?: RegExp
  balancePattern?: RegExp
  typeIndicators: {
    debit: string[]
    credit: string[]
  }
}

// Dashboard types
export interface DashboardStats {
  totalSpent: number
  totalIncome: number
  currentBalance: number
  transactionCount: number
  topCategories: CategoryStat[]
  weeklyTrend: WeeklyData[]
}

export interface CategoryStat {
  category: string
  amount: number
  percentage: number
  count: number
}

export interface WeeklyData {
  day: string
  spent: number
  income: number
}

// Scoring types
export interface ScoreCalculation {
  score: number
  dimensions: ScoreDimensions
  insights: string[]
  recommendations: string[]
}
