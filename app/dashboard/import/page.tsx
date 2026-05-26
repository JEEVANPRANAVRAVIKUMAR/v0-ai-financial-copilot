'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseMultipleSmsMessages, normalizeMerchant } from '@/lib/sms-parser'
import { createClient } from '@/lib/supabase/client'
import { Upload, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ImportPage() {
  const [smsText, setSmsText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null)
  const router = useRouter()

  const handleImport = async () => {
    if (!smsText.trim()) return

    setIsProcessing(true)
    setResult(null)

    try {
      const messages = smsText.split('\n').filter(m => m.trim())
      const parsed = parseMultipleSmsMessages(messages)

      if (parsed.length === 0) {
        setResult({ success: false, count: 0 })
        setIsProcessing(false)
        return
      }

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
        setResult({ success: false, count: 0 })
        return
      }

      setResult({ success: true, count: parsed.length })
      setSmsText('')
    } catch (error) {
      console.error('Error processing SMS:', error)
      setResult({ success: false, count: 0 })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import SMS</h1>
          <p className="text-muted-foreground">Add transactions from your bank SMS messages</p>
        </div>
      </div>

      {result?.success && (
        <Card className="border-emerald-500/50 bg-emerald-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-foreground">
              Successfully imported {result.count} transaction{result.count !== 1 ? 's' : ''}!
            </p>
          </CardContent>
        </Card>
      )}

      {result && !result.success && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4">
            <p className="text-foreground">
              No valid transactions found. Make sure your SMS messages are from supported banks.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paste SMS Messages</CardTitle>
          <CardDescription>
            Copy your bank SMS messages and paste them below. Each message should be on a new line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Example:\nHDFC Bank: Rs.500 debited from A/c **1234 to VPA swiggy@oksbi on 15-01-24. Avl Bal Rs.12,500.\n\nSBI: Your A/c X1234 is credited with Rs.50,000 on 01-01-24. Avl Bal Rs.62,500.\n\nPaytm: Rs.200 paid to PhonePe Merchant via UPI. Bal: Rs.1,500`}
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Supported Banks & Apps</h4>
            <div className="flex flex-wrap gap-2">
              {['SBI', 'HDFC', 'ICICI', 'Axis', 'Paytm', 'Google Pay', 'PhonePe'].map((bank) => (
                <span
                  key={bank}
                  className="px-3 py-1 bg-background rounded-full text-sm text-muted-foreground"
                >
                  {bank}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link href="/dashboard/transactions">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button
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
                  Import Transactions
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tips for Better Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Include the complete SMS message, including bank name and transaction details
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Promotional messages and OTPs are automatically filtered out
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Both debit and credit transactions are supported
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              UPI transactions from GPay, PhonePe, and Paytm are recognized
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
