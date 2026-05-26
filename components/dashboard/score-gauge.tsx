'use client'

import { useMemo } from 'react'
import { getScoreRating } from '@/lib/scoring-engine'

interface ScoreGaugeProps {
  score: number
  previousScore?: number
  size?: 'sm' | 'md' | 'lg'
}

export function ScoreGauge({ score, previousScore, size = 'lg' }: ScoreGaugeProps) {
  const { label, color } = getScoreRating(score)
  
  const sizeConfig = {
    sm: { width: 120, strokeWidth: 8, fontSize: 'text-2xl', labelSize: 'text-xs' },
    md: { width: 160, strokeWidth: 10, fontSize: 'text-3xl', labelSize: 'text-sm' },
    lg: { width: 200, strokeWidth: 12, fontSize: 'text-4xl', labelSize: 'text-base' },
  }
  
  const config = sizeConfig[size]
  const radius = (config.width - config.strokeWidth) / 2
  const circumference = radius * Math.PI // Semi-circle
  const progress = (score / 850) * 100
  const strokeDashoffset = circumference - (progress / 100) * circumference
  
  const scoreChange = previousScore ? score - previousScore : 0
  
  const gradientId = useMemo(() => `score-gradient-${Math.random().toString(36).slice(2)}`, [])

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.width, height: config.width / 2 + 20 }}>
        <svg
          width={config.width}
          height={config.width / 2 + 20}
          viewBox={`0 0 ${config.width} ${config.width / 2 + 20}`}
          className="transform"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgb(239 68 68)" />
              <stop offset="25%" stopColor="rgb(249 115 22)" />
              <stop offset="50%" stopColor="rgb(234 179 8)" />
              <stop offset="75%" stopColor="rgb(34 197 94)" />
              <stop offset="100%" stopColor="rgb(16 185 129)" />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2 + 10}
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2 + 10}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${config.width / 2 + 10}
                A ${radius} ${radius} 0 0 1 ${config.width - config.strokeWidth / 2} ${config.width / 2 + 10}`}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <span className={`${config.fontSize} font-bold text-foreground tabular-nums`}>
            {score}
          </span>
          <span className={`${config.labelSize} font-medium ${color}`}>
            {label}
          </span>
          {scoreChange !== 0 && (
            <span className={`text-xs ${scoreChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {scoreChange > 0 ? '+' : ''}{scoreChange} from last
            </span>
          )}
        </div>
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between w-full px-2 mt-1">
        <span className="text-xs text-muted-foreground">0</span>
        <span className="text-xs text-muted-foreground">850</span>
      </div>
    </div>
  )
}
