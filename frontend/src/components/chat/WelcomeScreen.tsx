import { memo } from "react"
import { cn } from "@/lib/utils"
import { GraduationCap, Calendar, DollarSign, BookOpen, FileText, HelpCircle } from "lucide-react"

interface WelcomeScreenProps {
  onSelectTopic: (topic: string) => void
  className?: string
}

const quickTopics = [
  {
    icon: GraduationCap,
    label: "Course Registration",
    query: "How do I register for courses?",
  },
  {
    icon: Calendar,
    label: "Academic Calendar",
    query: "What are the important academic dates?",
  },
  {
    icon: DollarSign,
    label: "Fees & Payments",
    query: "How do I pay my school fees?",
  },
  {
    icon: BookOpen,
    label: "Results & GPA",
    query: "How do I check my semester results?",
  },
  {
    icon: FileText,
    label: "Exams & Timetable",
    query: "When are my exams scheduled?",
  },
  {
    icon: HelpCircle,
    label: "Portal Help",
    query: "I can't login to my student portal",
  },
]

const WelcomeScreen = memo(function WelcomeScreen({
  onSelectTopic,
  className,
}: WelcomeScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-start h-full min-h-0 px-4 pb-4",
        className
      )}
    >
      <div className="w-full max-w-lg flex flex-col min-h-0">
        <div className="text-center py-4 sm:py-6 flex-shrink-0">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary mb-3 animate-float shadow-lg shadow-primary/30">
            <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-primary-foreground" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Welcome to UniHelp AI
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Ask me anything about your university
          </p>
        </div>

        <div className="flex-shrink-0">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-2 sm:mb-3">
            Quick Topics
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {quickTopics.map((topic, index) => (
              <button
                key={topic.label}
                onClick={() => onSelectTopic(topic.query)}
                className={cn(
                  "relative flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 bg-card text-left",
                  "transform transition-all duration-300 ease-out",
                  "hover:border-primary hover:bg-primary",
                  "hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/25",
                  "hover:-translate-y-1",
                  "active:scale-[0.98] active:shadow-md",
                  "group overflow-hidden",
                  `animate-slide-up stagger-${index + 1}`
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
                  "bg-primary/10 group-hover:bg-primary-foreground/20",
                  "transition-all duration-300",
                  "group-hover:scale-110"
                )}>
                  <topic.icon className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 text-primary",
                    "transition-colors duration-300",
                    "group-hover:text-primary-foreground"
                  )} />
                </div>
                <span className={cn(
                  "text-xs sm:text-sm font-medium transition-colors duration-300",
                  "text-foreground group-hover:text-primary-foreground"
                )}>
                  {topic.label}
                </span>
                
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

export { WelcomeScreen }
