import type { ParsedTransaction, BankPattern } from './types'

// Indian bank SMS patterns
const BANK_PATTERNS: BankPattern[] = [
  {
    name: 'SBI',
    patterns: [
      /SBI/i,
      /State Bank/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:at|to|from|@)\s*([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+ref|\s+UPI|$)/i,
    balancePattern: /(?:Bal|Balance|Avl Bal)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['debited', 'withdrawn', 'paid', 'sent', 'purchase', 'spent'],
      credit: ['credited', 'received', 'deposited', 'refund', 'cashback'],
    },
  },
  {
    name: 'HDFC',
    patterns: [
      /HDFC/i,
      /HDFCBANK/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)|INR\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:at|to|from|VPA)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\s+Ref|\.|$)/i,
    balancePattern: /(?:Bal|Available)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['debited', 'withdrawn', 'spent', 'paid', 'sent', 'txn'],
      credit: ['credited', 'received', 'deposited', 'refund'],
    },
  },
  {
    name: 'ICICI',
    patterns: [
      /ICICI/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)|INR\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:at|to|from|Info:)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\s+Avl|\.|\s+Ref|$)/i,
    balancePattern: /(?:Avl\.?\s*Bal|Balance)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['debited', 'withdrawn', 'spent', 'paid', 'purchase'],
      credit: ['credited', 'received', 'deposited', 'refund'],
    },
  },
  {
    name: 'Axis',
    patterns: [
      /Axis/i,
      /AXISBANK/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)|INR\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:at|to|from|@)\s*([A-Za-z0-9\s&.-]+?)(?:\s+on|\s+Ref|$)/i,
    balancePattern: /(?:Bal|Balance)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['debited', 'withdrawn', 'spent', 'paid'],
      credit: ['credited', 'received', 'deposited', 'refund'],
    },
  },
  {
    name: 'Paytm',
    patterns: [
      /Paytm/i,
      /PPBL/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:to|from|at)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\s+UPI|$)/i,
    balancePattern: /(?:Bal|Balance)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['debited', 'paid', 'sent', 'transfer'],
      credit: ['credited', 'received', 'added', 'cashback'],
    },
  },
  {
    name: 'GPay',
    patterns: [
      /Google Pay/i,
      /GPay/i,
      /GOOGLEPAY/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)|₹\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:to|from)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\.|$)/i,
    balancePattern: /(?:Bal)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['sent', 'paid', 'payment'],
      credit: ['received', 'got', 'cashback'],
    },
  },
  {
    name: 'PhonePe',
    patterns: [
      /PhonePe/i,
    ],
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)|₹\s*([\d,]+\.?\d*)/i,
    merchantPattern: /(?:to|from)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\.|$)/i,
    balancePattern: /(?:Bal)[:\s]*Rs\.?\s*([\d,]+\.?\d*)/i,
    typeIndicators: {
      debit: ['sent', 'paid', 'debited'],
      credit: ['received', 'credited', 'cashback'],
    },
  },
]

// Category classification based on merchant keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': [
    'swiggy', 'zomato', 'dominos', 'pizza', 'restaurant', 'cafe', 'food',
    'mcdonalds', 'kfc', 'burger', 'biryani', 'hotel', 'dhaba', 'kitchen',
    'blinkit', 'instamart', 'zepto', 'bigbasket', 'grofers', 'dunzo',
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'snapdeal',
    'mall', 'mart', 'store', 'shop', 'retail', 'fashion', 'clothing',
    'dmart', 'reliance', 'big bazaar', 'more', 'spencers',
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'metro', 'irctc', 'railway', 'bus',
    'petrol', 'fuel', 'parking', 'toll', 'fastag', 'cab', 'auto',
  ],
  'Bills & Utilities': [
    'electricity', 'water', 'gas', 'broadband', 'internet', 'wifi',
    'jio', 'airtel', 'vodafone', 'vi', 'bsnl', 'postpaid', 'prepaid',
    'recharge', 'bill pay', 'dth', 'tata sky',
  ],
  'Entertainment': [
    'netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'gaming',
    'movie', 'pvr', 'inox', 'cinema', 'bookmyshow', 'zee5', 'sonyliv',
  ],
  'Health': [
    'pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'apollo',
    'pharmeasy', 'netmeds', '1mg', 'practo', 'medplus', 'healthkart',
  ],
  'Education': [
    'school', 'college', 'university', 'course', 'udemy', 'coursera',
    'byju', 'unacademy', 'book', 'stationery', 'tuition',
  ],
  'Investment': [
    'zerodha', 'groww', 'upstox', 'angel', 'mutual fund', 'sip',
    'stock', 'share', 'trading', 'investment', 'paytm money',
  ],
  'Transfer': [
    'transfer', 'neft', 'rtgs', 'imps', 'upi', 'sent to', 'received from',
  ],
  'ATM': [
    'atm', 'cash withdrawal', 'atm withdrawal',
  ],
}

// Subscription services for leak detection
export const SUBSCRIPTION_SERVICES = [
  'netflix', 'prime', 'hotstar', 'spotify', 'youtube premium',
  'zee5', 'sonyliv', 'jiocinema', 'apple music', 'gaana',
  'audible', 'kindle', 'linkedin premium', 'medium',
  'dropbox', 'google one', 'icloud', 'microsoft 365',
  'adobe', 'canva', 'figma', 'notion',
  'gym', 'cult', 'fitness', 'yoga',
]

function detectBank(message: string): BankPattern | null {
  for (const bank of BANK_PATTERNS) {
    for (const pattern of bank.patterns) {
      if (pattern.test(message)) {
        return bank
      }
    }
  }
  return null
}

function extractAmount(message: string, bank: BankPattern): number | null {
  const match = message.match(bank.amountPattern)
  if (match) {
    const amountStr = (match[1] || match[2] || '').replace(/,/g, '')
    const amount = parseFloat(amountStr)
    return isNaN(amount) ? null : amount
  }
  return null
}

function extractMerchant(message: string, bank: BankPattern): string | null {
  if (!bank.merchantPattern) return null
  const match = message.match(bank.merchantPattern)
  if (match && match[1]) {
    return match[1].trim().substring(0, 100)
  }
  return null
}

function extractBalance(message: string, bank: BankPattern): number | null {
  if (!bank.balancePattern) return null
  const match = message.match(bank.balancePattern)
  if (match && match[1]) {
    const balanceStr = match[1].replace(/,/g, '')
    const balance = parseFloat(balanceStr)
    return isNaN(balance) ? null : balance
  }
  return null
}

function detectTransactionType(message: string, bank: BankPattern): 'debit' | 'credit' {
  const lowerMessage = message.toLowerCase()
  
  for (const indicator of bank.typeIndicators.debit) {
    if (lowerMessage.includes(indicator)) {
      return 'debit'
    }
  }
  
  for (const indicator of bank.typeIndicators.credit) {
    if (lowerMessage.includes(indicator)) {
      return 'credit'
    }
  }
  
  // Default to debit if unsure
  return 'debit'
}

function classifyCategory(merchant: string | null, message: string): string {
  const searchText = `${merchant || ''} ${message}`.toLowerCase()
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category
      }
    }
  }
  
  return 'Other'
}

function extractUpiId(message: string): string | null {
  const upiPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i
  const match = message.match(upiPattern)
  return match ? match[1] : null
}

function calculateConfidence(
  amount: number | null,
  type: 'debit' | 'credit',
  merchant: string | null,
  bank: BankPattern | null
): number {
  let confidence = 0.5 // Base confidence
  
  if (amount !== null && amount > 0) confidence += 0.2
  if (merchant) confidence += 0.15
  if (bank) confidence += 0.1
  if (type) confidence += 0.05
  
  return Math.min(confidence, 1)
}

export function parseSmsMessage(message: string): ParsedTransaction | null {
  // Skip non-transactional messages
  const skipPatterns = [
    /OTP/i,
    /password/i,
    /login/i,
    /verification/i,
    /CVV/i,
    /PIN/i,
    /promotion/i,
    /offer/i,
    /discount/i,
    /congratulations/i,
  ]
  
  for (const pattern of skipPatterns) {
    if (pattern.test(message)) {
      return null
    }
  }
  
  const bank = detectBank(message)
  if (!bank) {
    // Try generic parsing for unknown banks
    return parseGenericMessage(message)
  }
  
  const amount = extractAmount(message, bank)
  if (amount === null || amount <= 0) {
    return null
  }
  
  const type = detectTransactionType(message, bank)
  const merchant = extractMerchant(message, bank)
  const balance = extractBalance(message, bank)
  const upiId = extractUpiId(message)
  const category = classifyCategory(merchant, message)
  const confidence = calculateConfidence(amount, type, merchant, bank)
  
  return {
    amount,
    type,
    merchant,
    category,
    timestamp: new Date(),
    balance,
    bankName: bank.name,
    upiId,
    confidence,
    rawMessage: message,
  }
}

function parseGenericMessage(message: string): ParsedTransaction | null {
  // Generic amount pattern
  const amountMatch = message.match(/Rs\.?\s*([\d,]+\.?\d*)|INR\s*([\d,]+\.?\d*)|₹\s*([\d,]+\.?\d*)/i)
  if (!amountMatch) return null
  
  const amountStr = (amountMatch[1] || amountMatch[2] || amountMatch[3] || '').replace(/,/g, '')
  const amount = parseFloat(amountStr)
  if (isNaN(amount) || amount <= 0) return null
  
  // Detect type
  const lowerMessage = message.toLowerCase()
  let type: 'debit' | 'credit' = 'debit'
  if (lowerMessage.includes('credited') || lowerMessage.includes('received') || lowerMessage.includes('deposited')) {
    type = 'credit'
  }
  
  // Try to extract merchant
  const merchantMatch = message.match(/(?:at|to|from)\s*([A-Za-z0-9\s&@.-]+?)(?:\s+on|\s+ref|$)/i)
  const merchant = merchantMatch ? merchantMatch[1].trim().substring(0, 100) : null
  
  const category = classifyCategory(merchant, message)
  
  return {
    amount,
    type,
    merchant,
    category,
    timestamp: new Date(),
    balance: null,
    bankName: null,
    upiId: extractUpiId(message),
    confidence: 0.4,
    rawMessage: message,
  }
}

export function parseMultipleSmsMessages(messages: string[]): ParsedTransaction[] {
  const parsed: ParsedTransaction[] = []
  
  for (const message of messages) {
    const transaction = parseSmsMessage(message.trim())
    if (transaction) {
      parsed.push(transaction)
    }
  }
  
  return parsed
}

export function normalizeMerchant(merchant: string | null): string | null {
  if (!merchant) return null
  
  // Remove common suffixes and normalize
  let normalized = merchant
    .toLowerCase()
    .replace(/\s+(pvt|ltd|limited|private|india|inc|llp)\.?/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
  
  // Common merchant normalization
  const merchantMappings: Record<string, string> = {
    'swiggy': 'Swiggy',
    'zomato': 'Zomato',
    'amazon': 'Amazon',
    'flipkart': 'Flipkart',
    'uber': 'Uber',
    'ola': 'Ola',
    'netflix': 'Netflix',
    'spotify': 'Spotify',
    'google pay': 'Google Pay',
    'phonepe': 'PhonePe',
    'paytm': 'Paytm',
  }
  
  for (const [key, value] of Object.entries(merchantMappings)) {
    if (normalized.includes(key)) {
      return value
    }
  }
  
  // Title case the merchant name
  return merchant
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .substring(0, 100)
}
