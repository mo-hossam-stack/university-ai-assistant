import { cn } from "@/lib/utils"

interface IconProps {
  className?: string
}

// 1. Course Registration: Abstract Gateway / Shield with nested intelligence core
export const CourseRegIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Outer geometric shield/portal */}
    <path
      d="M5 3v9c0 4.418 3.582 8 8 8s8-3.582 8-8V3L13 6.5 5 3z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Nested floating core */}
    <path
      d="M13 9.5l1.5 1.5-1.5 1.5-1.5-1.5L13 9.5z"
      fill="currentColor"
      className="animate-pulse"
    />
    <circle cx="13" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

// 2. Results & GPA: Dynamic progress curves / rising prism towers
export const ResultsGpaIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Non-traditional rising towers with dynamic angles */}
    <path
      d="M4 20h16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M7 20v-5M12 20V9M17 20V4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Loop wrapping the peak growth */}
    <path
      d="M17 4c-1 0-2 2-3 4.5S11 15 9.5 15"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="2 2"
    />
    {/* Peak diamond node */}
    <rect
      x="15.5"
      y="2.5"
      width="3"
      height="3"
      rx="0.5"
      transform="rotate(45 17 4)"
      fill="currentColor"
    />
  </svg>
)

// 3. Academic Calendar: Cyclical orbital dial instead of a calendar grid
export const CalendarIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Concentric orbital paths */}
    <circle
      cx="12"
      cy="12"
      r="8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeDasharray="14 6"
      className="animate-[spin_10s_linear_infinite]"
      style={{ transformOrigin: "12px 12px" }}
    />
    <circle
      cx="12"
      cy="12"
      r="4"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    {/* Center node */}
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    {/* Tilted alignment ray representing dates */}
    <line
      x1="12"
      y1="4"
      x2="12"
      y2="2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <line
      x1="12"
      y1="22"
      x2="12"
      y2="20"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
)

// 4. Fees & Payments: Interlocking Möbius infinity curves (flow)
export const FeesPaymentsIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Möbius loop representing flow */}
    <path
      d="M7 15a3 3 0 100-6 3 3 0 000 6zM17 15a3 3 0 100-6 3 3 0 000 6z"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M7 12c2.5 0 7.5 6 10 6M17 12c-2.5 0-7.5-6-10-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.25" />
  </svg>
)

// 5. Exams & Timetable: Intersecting timeline beams
export const ExamsTimetableIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Hexagonal structural frame */}
    <path
      d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Core time-slice coordinates */}
    <path
      d="M12 2v10M12 12l8.66-5M12 12l-8.66-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
  </svg>
)

// 6. Portal Help: Concentric network nodes / Portal keyhole
export const PortalHelpIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
  >
    {/* Outer radar wave rings */}
    <path
      d="M18.36 5.64a9 9 0 010 12.72M5.64 5.64a9 9 0 000 12.72"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Nested core link */}
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M12 15.5v3M10.5 18.5h3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)
