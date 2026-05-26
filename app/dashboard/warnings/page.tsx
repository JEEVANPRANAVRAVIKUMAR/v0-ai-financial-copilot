import { createClient } from '@/lib/supabase/server'
import { WarningsClient } from './warnings-client'
import { generateWarnings } from '@/lib/warning-engine'
import type { Transaction, Warning } from '@/lib/types'

export default async function WarningsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user!.id)
    .order('timestamp', { ascending: false })

  // Fetch existing warnings
  const { data: existingWarnings } = await supabase
    .from('warnings')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const txList = (transactions || []) as Transaction[]
  const warningsList = (existingWarnings || []) as Warning[]

  // Generate new warnings
  const generatedWarnings = generateWarnings(txList, warningsList)

  // Combine existing and new warnings
  const allWarnings = [
    ...warningsList,
    ...generatedWarnings.map((w, i) => ({
      ...w,
      id: `new-${i}`,
      user_id: user!.id,
      dismissed: false,
      created_at: new Date().toISOString(),
    })),
  ] as Warning[]

  return <WarningsClient initialWarnings={allWarnings} userId={user!.id} />
}
