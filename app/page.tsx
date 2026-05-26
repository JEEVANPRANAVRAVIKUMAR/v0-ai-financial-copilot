import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  Shield, 
  Bell, 
  PieChart, 
  Smartphone,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">FinCopilot</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            100% Privacy-First Design
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight text-balance">
            Your AI Financial <span className="text-primary">Copilot</span> for Smarter Spending
          </h1>
          <p className="text-xl text-muted-foreground mt-6 max-w-2xl mx-auto text-pretty">
            Transform your bank SMS messages into actionable insights. Get behavior scoring, 
            proactive warnings, and personalized recommendations to improve your financial health.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link href="/auth/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">
              Everything you need to manage your finances
            </h2>
            <p className="text-muted-foreground mt-4">
              Powerful features designed for the Indian fintech ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="SMS Parsing"
              description="Automatically extract transactions from bank SMS messages. Supports SBI, HDFC, ICICI, Axis, Paytm, GPay, PhonePe and more."
            />
            <FeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Behavior Score"
              description="Get a comprehensive 0-850 score based on your spending patterns, consistency, impulse control, and savings rate."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6" />}
              title="Smart Warnings"
              description="Proactive alerts for overspending, subscription leaks, duplicate charges, and unusual transactions."
            />
            <FeatureCard
              icon={<PieChart className="w-6 h-6" />}
              title="Spending Analytics"
              description="Visual breakdowns by category, merchant, and time period. Understand where your money goes."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Privacy First"
              description="Your financial data stays secure. We use bank-level encryption and never share your information."
            />
            <FeatureCard
              icon={<CheckCircle className="w-6 h-6" />}
              title="Actionable Insights"
              description="Personalized recommendations to improve your financial health and build better habits."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">How it works</h2>
            <p className="text-muted-foreground mt-4">Get started in under 2 minutes</p>
          </div>

          <div className="space-y-8">
            <StepItem
              number={1}
              title="Create your account"
              description="Sign up with your email. No credit card required."
            />
            <StepItem
              number={2}
              title="Import your SMS"
              description="Copy and paste your bank SMS messages. We'll automatically parse and categorize them."
            />
            <StepItem
              number={3}
              title="Get your score"
              description="View your behavior score and start receiving personalized insights and warnings."
            />
          </div>

          <div className="text-center mt-12">
            <Link href="/auth/sign-up">
              <Button size="lg">
                Get Started Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to take control of your finances?
          </h2>
          <p className="text-muted-foreground mt-4">
            Join thousands of users who are already spending smarter with FinCopilot.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link href="/auth/sign-up">
              <Button size="lg">Create Free Account</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">FinCopilot</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for the Indian fintech ecosystem
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepItem({ 
  number, 
  title, 
  description 
}: { 
  number: number
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
