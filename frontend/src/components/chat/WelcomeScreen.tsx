import { memo, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  Calendar,
  DollarSign,
  BookOpen,
  FileText,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react"

interface WelcomeScreenProps {
  onSelectTopic: (topic: string) => void
  className?: string
}

/**
 * Bento cell definition
 * - featured: spans 2 cols on md+, gets brand gradient + glow outline
 * - wide:     spans 2 cols on lg+, single col on md
 * - normal:   single col always
 */
type CellSize = "featured" | "wide" | "normal"

interface TopicCell {
  icon: React.ElementType
  label: string
  query: string
  description: string
  size: CellSize
}

const quickTopics: TopicCell[] = [
  {
    icon: GraduationCap,
    label: "Course Registration",
    query: "How do I register for courses?",
    description: "Enroll in subjects, manage your academic load, and update selections.",
    size: "featured",
  },
  {
    icon: BookOpen,
    label: "Results & GPA",
    query: "How do I check my semester results?",
    description: "View grades, track your GPA, and download transcripts.",
    size: "wide",
  },
  {
    icon: Calendar,
    label: "Academic Calendar",
    query: "What are the important academic dates?",
    description: "Deadlines, holidays, and exam periods.",
    size: "normal",
  },
  {
    icon: DollarSign,
    label: "Fees & Payments",
    query: "How do I pay my school fees?",
    description: "Tuition deadlines, payment methods, and receipts.",
    size: "normal",
  },
  {
    icon: FileText,
    label: "Exams & Timetable",
    query: "When are my exams scheduled?",
    description: "Hall assignments, schedules, and rules.",
    size: "normal",
  },
  {
    icon: HelpCircle,
    label: "Portal Help",
    query: "I can't login to my student portal",
    description: "Password reset, account issues, and navigation.",
    size: "normal",
  },
]

// Stagger delay map per index
const staggerDelays = [0, 60, 120, 180, 240, 300]

// Col-span class map
const colSpanMap: Record<CellSize, string> = {
  featured: "col-span-1 md:col-span-2",
  wide:     "col-span-1 md:col-span-2 lg:col-span-2",
  normal:   "col-span-1",
}

const WelcomeScreen = memo(function WelcomeScreen({
  onSelectTopic,
  className,
}: WelcomeScreenProps) {
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Trigger staggered entrance using IntersectionObserver / direct class toggling
  useEffect(() => {
    const cells = cellRefs.current
    const timers: ReturnType<typeof setTimeout>[] = []

    cells.forEach((cell, i) => {
      if (!cell) return
      // Start invisible
      cell.style.opacity = "0"
      cell.style.transform = "translateY(16px) scale(0.97)"
      cell.style.transition = "none"

      const t = setTimeout(() => {
        if (!cell) return
        cell.style.transition =
          "opacity 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)"
        cell.style.opacity = "1"
        cell.style.transform = "translateY(0) scale(1)"
      }, staggerDelays[i] ?? i * 60)

      timers.push(t)
    })

    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-start h-full min-h-0 px-4 pb-4 overflow-y-auto",
        className
      )}
    >
      <div className="w-full max-w-2xl flex flex-col min-h-0 py-4 sm:py-6">

        {/* ── Hero heading ───────────────────────────────────────── */}
        <div className="text-center mb-6 sm:mb-8 flex-shrink-0">
          <div
            className={cn(
              "inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4",
              "bg-primary shadow-xl shadow-primary/30",
              "animate-float"
            )}
          >
            <GraduationCap
              className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground"
              aria-hidden="true"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display">
            Welcome to UniHelp AI
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            Ask me anything about your university — or pick a topic below.
          </p>
        </div>

        {/* ── Section label ───────────────────────────────────────── */}
        <p
          className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-3 sm:mb-4 flex-shrink-0"
          aria-label="Quick topics"
        >
          Quick Topics
        </p>

        {/* ── Bento Grid ──────────────────────────────────────────── */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-shrink-0"
          role="list"
          aria-label="Topic shortcuts"
        >
          {quickTopics.map((topic, index) => {
            const isFeatured = topic.size === "featured"
            const Icon = topic.icon

            return (
              <button
                key={topic.label}
                ref={(el) => { cellRefs.current[index] = el }}
                type="button"
                role="listitem"
                onClick={() => onSelectTopic(topic.query)}
                aria-label={`Ask about ${topic.label}: ${topic.description}`}
                className={cn(
                  // grid span
                  colSpanMap[topic.size],

                  // base layout
                  "group relative flex items-start gap-3 p-4 sm:p-5 rounded-2xl text-left",
                  "cursor-pointer select-none",

                  // interaction
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-1 hover:scale-[1.015]",
                  "active:scale-[0.98] active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",

                  // featured vs normal surface
                  isFeatured
                    ? [
                        "border border-primary/40 bg-primary/5",
                        "bento-featured-glow",
                        "hover:border-primary/70 hover:bg-primary/10",
                      ]
                    : [
                        "border border-border bg-card/80 backdrop-blur-sm",
                        "hover:border-primary/30 hover:bg-accent/60",
                        "shadow-sm hover:shadow-md hover:shadow-primary/10",
                      ]
                )}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center rounded-xl",
                    "transition-all duration-300",
                    isFeatured
                      ? "w-11 h-11 bg-primary/15 group-hover:bg-primary/25 group-hover:scale-110"
                      : "w-10 h-10 bg-primary/10 group-hover:bg-primary/20 group-hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "text-primary transition-colors duration-300",
                      isFeatured ? "w-5 h-5 sm:w-6 sm:h-6" : "w-4 h-4 sm:w-5 sm:h-5"
                    )}
                    aria-hidden="true"
                  />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={cn(
                        "font-semibold text-foreground transition-colors duration-200 group-hover:text-primary",
                        isFeatured ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                      )}
                    >
                      {topic.label}
                    </span>

                    {/* "Featured" sparkle badge */}
                    {isFeatured && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                          "text-[10px] font-semibold uppercase tracking-wide",
                          "bg-primary/15 text-primary border border-primary/25"
                        )}
                        aria-label="Primary topic"
                      >
                        <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
                        Primary
                      </span>
                    )}
                  </div>

                  <p
                    className={cn(
                      "text-muted-foreground leading-snug line-clamp-2 transition-colors duration-200",
                      isFeatured ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs"
                    )}
                  >
                    {topic.description}
                  </p>
                </div>

                {/* Hover arrow — appears on hover */}
                <div
                  className={cn(
                    "flex-shrink-0 self-center",
                    "opacity-0 -translate-x-2",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                    "transition-all duration-300 ease-out"
                  )}
                  aria-hidden="true"
                >
                  <ArrowRight
                    className={cn(
                      "text-primary",
                      isFeatured ? "w-4 h-4" : "w-3.5 h-3.5"
                    )}
                  />
                </div>

                {/* Radial brand gradient overlay for featured */}
                {isFeatured && (
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity duration-300"
                    style={{
                      background:
                        "radial-gradient(ellipse at 20% 50%, var(--bg-mesh-a) 0%, transparent 70%)",
                    }}
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export { WelcomeScreen }
