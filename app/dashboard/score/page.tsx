import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreGauge } from '@/components/dashboard/score-gauge'
import { ScoreDimensionsChart } from '@/components/dashboard/charts'
import { calculateBehaviorScore, getScoreRating } from '@/lib/scoring-engine'
import type { Transaction, BehaviorScore } from '@/lib/types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format } from 'date-fns'

export default async function ScorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('timestamp', { ascending: false })

  const txList = (transactions || []) as Transaction[]
  const scoreResult = calculateBehaviorScore(txList)
  const rating = getScoreRating(scoreResult.score)

  // Fetch score history
  const { data: scoreHistory } = await supabase
    .from('behavior_scores')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const historyList = (scoreHistory || []) as BehaviorScore[]
  const previousScore = historyList.length > 0 ? historyList[0].score : undefined

  // Score dimensions for chart
  const scoreDimensionsData = [
    { name: 'Consistency', value: scoreResult.dimensions.consistency },
    { name: 'Impulse Control', value: scoreResult.dimensions.impulseControl },
    { name: 'Savings Rate', value: scoreResult.dimensions.savingsRate },
    { name: 'Bill Discipline', value: scoreResult.dimensions.billDiscipline },
    { name: 'Category Balance', value: scoreResult.dimensions.categoryBalance },
  ]

  // Calculate trend
  const scoreChange = previousScore ? scoreResult.score - previousScore : 0
  const trendDirection = scoreChange > 5 ? 'up' : scoreChange < -5 ? 'down' : 'stable'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Behavior Score</h1>
        <p className="text-muted-foreground">Track your financial behavior over time</p>
      </div>

      {/* Main Score Card */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ScoreGauge score={scoreResult.score} previousScore={previousScore} size="lg" />
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Your score is <span className={rating.color}>{rating.label}</span>
                </h2>
                <p className="text-muted-foreground mt-1">
                  Based on {txList.length} transactions analyzed
                </p>
              </div>
              
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                {trendDirection === 'up' && (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="text-foreground">
                      Up {scoreChange} points from your previous score
                    </span>
                  </>
                )}
                {trendDirection === 'down' && (
                  <>
                    <TrendingDown className="w-5 h-5 text-red-500" />
                    <span className="text-foreground">
                      Down {Math.abs(scoreChange)} points from your previous score
                    </span>
                  </>
                )}
                {trendDirection === 'stable' && (
                  <>
                    <Minus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-foreground">Your score is stable</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreDimensionsChart data={scoreDimensionsData} />
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Factors Explained</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreFactorItem
              name="Consistency"
              score={scoreResult.dimensions.consistency}
              description="How stable your daily spending patterns are"
            />
            <ScoreFactorItem
              name="Impulse Control"
              score={scoreResult.dimensions.impulseControl}
              description="Avoiding late-night and emotional purchases"
            />
            <ScoreFactorItem
              name="Savings Rate"
              score={scoreResult.dimensions.savingsRate}
              description="Difference between income and spending"
            />
            <ScoreFactorItem
              name="Bill Discipline"
              score={scoreResult.dimensions.billDiscipline}
              description="Regular payment of bills and subscriptions"
            />
            <ScoreFactorItem
              name="Category Balance"
              score={scoreResult.dimensions.categoryBalance}
              description="Healthy distribution across spending categories"
            />
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreResult.insights.length > 0 ? (
              <div className="space-y-3">
                {scoreResult.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <p className="text-sm text-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Add more transactions to see personalized insights
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {scoreResult.recommendations.length > 0 ? (
              <div className="space-y-3">
                {scoreResult.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/10">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground">{rec}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Great job! No specific recommendations at this time.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score History */}
      {historyList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyList.map((record, index) => {
                const prevRecord = historyList[index + 1]
                const change = prevRecord ? record.score - prevRecord.score : 0
                const recordRating = getScoreRating(record.score)
                
                return (
                  <div key={record.id} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-20">
                      {format(new Date(record.created_at), 'MMM d')}
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(record.score / 850) * 100}%` }}
                      />
                    </div>
                    <span className={`font-semibold w-12 ${recordRating.color}`}>
                      {record.score}
                    </span>
                    {change !== 0 && (
                      <span className={`text-sm w-16 text-right ${change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ScoreFactorItem({ 
  name, 
  score, 
  description 
}: { 
  name: string
  score: number
  description: string 
}) {
  const getColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-foreground">{name}</p>
          <span className={`font-bold ${getColor(score)}`}>{score}/100</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all ${
              score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}
