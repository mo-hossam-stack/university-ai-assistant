import { memo } from "react"
import { cn } from "@/lib/utils"

export const Background3D = memo(function Background3D() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background transition-colors duration-500"
    >
      {/* ──── Shape 1: 3D Matte/Glass Sphere (Top Left) ──── */}
      <div
        className={cn(
          "absolute top-[10%] left-[8%] w-[180px] h-[180px] sm:w-[260px] sm:h-[260px]",
          "animate-[drift_25s_ease-in-out_infinite_alternate]"
        )}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_20px_50px_rgba(8,145,178,0.25)] dark:drop-shadow-[0_20px_50px_rgba(6,182,212,0.15)] animate-[spin_30s_linear_infinite]">
          <defs>
            <radialGradient id="sphereGrad" cx="30%" cy="30%" r="70%">
              {/* Highlight */}
              <stop offset="0%" stopColor="#22d3ee" />
              {/* Base */}
              <stop offset="50%" stopColor="#0891b2" />
              {/* Shadow border */}
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <radialGradient id="sphereSpec" cx="30%" cy="30%" r="30%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#sphereGrad)" />
          {/* Glossy Reflection Overlay */}
          <circle cx="50" cy="50" r="48" fill="url(#sphereSpec)" />
        </svg>
      </div>

      {/* ──── Shape 2: 3D Floating Octahedron / Diamond (Bottom Right) ──── */}
      <div
        className={cn(
          "absolute bottom-[12%] right-[5%] w-[150px] h-[150px] sm:w-[220px] sm:h-[220px]",
          "animate-[drift_22s_ease-in-out_infinite_alternate-reverse]"
        )}
        style={{ animationDelay: "-5s" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_25px_60px_rgba(59,130,246,0.30)] dark:drop-shadow-[0_25px_60px_rgba(37,99,235,0.18)] animate-[spin_20s_linear_infinite]">
          <defs>
            {/* Gradient per facet to give the volumetric 3D look */}
            <linearGradient id="facetA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="facetB" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="facetC" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e40af" />
            </linearGradient>
            <linearGradient id="facetD" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          {/* Top-pointing pyramid facets */}
          <polygon points="50,5 20,50 50,50" fill="url(#facetA)" />
          <polygon points="50,5 50,50 80,50" fill="url(#facetB)" />
          {/* Bottom-pointing pyramid facets */}
          <polygon points="20,50 50,95 50,50" fill="url(#facetC)" />
          <polygon points="50,50 50,95 80,50" fill="url(#facetD)" />
        </svg>
      </div>

      {/* ──── Shape 3: 3D Torus / Glass Ring (Center-Left) ──── */}
      <div
        className={cn(
          "absolute top-[45%] left-[-5%] sm:left-[2%] w-[130px] h-[130px] sm:w-[180px] sm:h-[180px]",
          "animate-[drift_28s_ease-in-out_infinite_alternate]"
        )}
        style={{ animationDelay: "-12s" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_15px_40px_rgba(20,184,166,0.22)] dark:drop-shadow-[0_15px_40px_rgba(20,184,166,0.12)] animate-[spin_40s_linear_infinite]">
          <defs>
            <linearGradient id="torusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
            <mask id="torusHole">
              <rect x="0" y="0" width="100" height="100" fill="white" />
              <circle cx="50" cy="50" r="22" fill="black" />
            </mask>
          </defs>
          {/* Outer ring */}
          <circle cx="50" cy="50" r="44" fill="url(#torusGrad)" mask="url(#torusHole)" />
          {/* Volumetric highlight inner arc */}
          <path
            d="M 16 50 A 34 34 0 0 1 84 50"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* ──── Shape 4: 3D Floating Capsule / cylinder (Top Right) ──── */}
      <div
        className={cn(
          "absolute top-[15%] right-[25%] w-[80px] h-[130px]",
          "animate-[drift_18s_ease-in-out_infinite_alternate-reverse]"
        )}
        style={{ animationDelay: "-8s" }}
      >
        <svg viewBox="0 0 80 130" className="w-full h-full drop-shadow-[0_15px_35px_rgba(16,185,129,0.20)] dark:drop-shadow-[0_15px_35px_rgba(16,185,129,0.10)] animate-[spin_25s_linear_infinite]">
          <defs>
            <linearGradient id="cylinderBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="30%" stopColor="#6ee7b7" />
              <stop offset="70%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="cylinderCap" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a7f3d0" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          {/* Cylinder side body */}
          <path d="M 15 25 L 15 105 A 25 10 0 0 0 65 105 L 65 25 Z" fill="url(#cylinderBody)" />
          {/* Cylinder top cap */}
          <ellipse cx="40" cy="25" rx="25" ry="10" fill="url(#cylinderCap)" />
          {/* Cylinder bottom cap curve outline */}
          <ellipse cx="40" cy="105" rx="25" ry="10" fill="url(#cylinderBody)" opacity="0.8" />
        </svg>
      </div>

      {/* Subtle overlay grid/noise to merge everything together */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"
      />
    </div>
  )
})
