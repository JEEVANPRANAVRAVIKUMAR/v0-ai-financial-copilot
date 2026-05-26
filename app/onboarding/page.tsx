'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseMultipleSmsMessages, normalizeMerchant } from '@/lib/sms-parser'
import { calculateBehaviorScore } from '@/lib/scoring-engine'
import { createClient } from '@/lib/supabase/client'
import { 
  Shield, 
  MessageSquare, 
  CheckCircle, 
  ChevronRight, 
  Upload,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import { ScoreGauge } from '@/components/dashboard/score-gauge'

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'import', title: 'Import SMS' },
  { id: 'review', title: 'Review' },
  { id: 'complete', title: 'Complete' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [smsText, setSmsText] = useState('')
  const [parsedCount, setParsedCount] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()

  const handleImport = async () => {
    if (!smsText.trim()) return

    setIsProcessing(true)
    
    try {
      // Split by newlines and parse
      const messages = smsText.split('\n').filter(m => m.trim())
      const parsed = parseMultipleSmsMessages(messages)
      
      if (parsed.length === 0) {
        setParsedCount(0)
        setIsProcessing(false)
        return
      }

      // Save to database
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const transactionsToInsert = parsed.map(tx => ({
        user_id: user.id,
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant,
        normalized_merchant: normalizeMerchant(tx.merchant),
        category: tx.category,
        timestamp: tx.timestamp.toISOString(),
        balance: tx.balance,
        source: 'sms_import',
        raw_message: tx.rawMessage,
        confidence: tx.confidence,
        bank_name: tx.bankName,
        upi_id: tx.upiId,
      }))

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert)

      if (error) {
        console.error('Error inserting transactions:', error)
        setIsProcessing(false)
        return
      }

      // Calculate score
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)

      const scoreResult = calculateBehaviorScore(transactions || [])
      
      // Save score
      await supabase.from('behavior_scores').insert({
        user_id: user.id,
        score: scoreResult.score,
        dimensions: scoreResult.dimensions,
      })

      setParsedCount(parsed.length)
      setScore(scoreResult.score)
      setStep(2)
    } catch (error) {
      console.error('Error processing SMS:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleComplete = async () => {
    setIsProcessing(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      setStep(3)
      
      // Redirect after a brief moment
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkip = async () => {
    setIsProcessing(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Mark onboarding as complete
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)

      router.push('/dashboard')
    } catch (error) {
      console.error('Error skipping onboarding:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Welcome to FinCopilot</CardTitle>
                <CardDescription>
                  Your AI-powered financial assistant that helps you spend smarter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <FeatureItem
                    icon={<Shield className="w-5 h-5" />}
                    title="Privacy First"
                    description="Your data never leaves your device. We only process locally."
                  />
                  <FeatureItem
                    icon={<MessageSquare className="w-5 h-5" />}
                    title="SMS Parsing"
                    description="Automatically extract transactions from your bank SMS messages"
                  />
                  <FeatureItem
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Behavior Score"
                    description="Get a financial health score based on your spending patterns"
                  />
                </div>

                <Button className="w-full" size="lg" onClick={() => setStep(1)}>
                  Get Started <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Import SMS */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Import Your SMS</CardTitle>
                <CardDescription>
                  Paste your bank SMS messages below. Each message should be on a new line.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`Example:\nHDFC Bank: Rs.500 debited from A/c **1234 to VPA swiggy@oksbi on 15-01-24. Avl Bal Rs.12,500.\n\nSBI: Your A/c X1234 is credited with Rs.50,000 on 01-01-24. Avl Bal Rs.62,500.`}
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">Supported Banks</h4>
                  <div className="flex flex-wrap gap-2">
                    {['SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'GPay', 'PhonePe'].map((bank) => (
                      <span
                        key={bank}
                        className="px-2 py-1 bg-background rounded text-xs text-muted-foreground"
                      >
                        {bank}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSkip}
                    disabled={isProcessing}
                  >
                    Skip for now
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleImport}
                    disabled={!smsText.trim() || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import SMS
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <Card>
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <CardTitle>Import Complete!</CardTitle>
                <CardDescription>
                  Successfully imported {parsedCount} transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {score !== null && (
                  <div className="flex justify-center">
                    <ScoreGauge score={score} size="md" />
                  </div>
                )}

                <div className="text-center">
                  <p className="text-muted-foreground">
                    Your initial behavior score has been calculated based on your transaction history.
                  </p>
                </div>

                <Button className="w-full" size="lg" onClick={handleComplete} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Complete */}
          {step === 3 && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">All Set!</h2>
                <p className="text-muted-foreground mb-4">
                  Redirecting you to your dashboard...
                </p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function FeatureItem({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
