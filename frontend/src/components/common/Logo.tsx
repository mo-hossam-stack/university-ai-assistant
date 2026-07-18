import { memo } from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  animated?: boolean
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14 sm:w-16 sm:h-16",
  xl: "w-20 h-20",
}

export const Logo = memo(function Logo({ className, size = "md", animated = true }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
      aria-hidden="true"
    >
      <defs>
        {/* Main Ribbon Gradient: Deep Emerald to Cyan */}
        <linearGradient id="unihelp-logo-ribbon" x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        {/* Intelligence Spark Gradient: Radiant Mint to Electric Blue */}
        <linearGradient id="unihelp-logo-spark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* Orbit Ring Gradient: Semi-transparent Cyan to Blue */}
        <linearGradient id="unihelp-logo-orbit" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.4" />
        </linearGradient>

        {/* Glow Filter for the Spark */}
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Orbit Ring (Background Layer) */}
      <ellipse
        cx="50"
        cy="52"
        rx="38"
        ry="10"
        transform="rotate(-28 50 52)"
        stroke="url(#unihelp-logo-orbit)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="90 40"
        className={cn(animated && "animate-[spin_8s_linear_infinite]")}
        style={{ transformOrigin: "50px 52px" }}
      />

      {/* 2. Abstract "U" Ribbon Vessel */}
      <path
        d="M24 28
           C24 56 36 72 50 72
           C64 72 76 56 76 28
           C76 20 70 20 66 28
           C60 46 56 58 50 58
           C44 58 40 46 34 28
           C30 20 24 20 24 28Z"
        fill="url(#unihelp-logo-ribbon)"
        className={cn(animated && "transition-transform duration-500 hover:scale-105")}
      />

      {/* 3. Floating Spark of Intelligence (Center) */}
      <path
        d="M50 28 
           Q50 42 64 42 
           Q50 42 50 56 
           Q50 42 36 42 
           Q50 42 50 28 Z"
        fill="url(#unihelp-logo-spark)"
        filter="url(#logo-glow)"
        className={cn(animated && "animate-pulse")}
        style={{
          transformOrigin: "50px 42px",
          animationDuration: "2s",
        }}
      />
    </svg>
  )
})
