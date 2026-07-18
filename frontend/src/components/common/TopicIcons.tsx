import { cn } from "@/lib/utils"

interface IconProps {
  className?: string
}

// 1. Course Registration: Stylized Graduation Cap with checkmark/registry detail
export const CourseRegIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Cap top diamond */}
    <path
      d="M12 3L22 8.5L12 14L2 8.5L12 3Z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    {/* Cap bottom support */}
    <path d="M6 12v3.5C6 17 8.5 18.5 12 18.5s6-1.5 6-3.5V12" />
    {/* Tassel line */}
    <path d="M18 10v4" />
    {/* Registry checkmark overlay */}
    <path
      d="M9.5 13.5l1.5 1.5 3.5-3.5"
      stroke="var(--primary)"
      strokeWidth="2"
    />
  </svg>
)

// 2. Results & GPA: Open academic book where pages emerge as a rising bar chart
export const ResultsGpaIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Open book background */}
    <path
      d="M2 19.5A2.5 2.5 0 014.5 17H12M22 19.5A2.5 2.5 0 0019.5 17H12"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <path d="M12 6v11" />
    {/* Rising bars (GPA growth) emerging from the pages */}
    <path
      d="M6 14v-4"
      strokeWidth="2"
    />
    <path
      d="M9 14v-7"
      stroke="var(--primary)"
      strokeWidth="2"
    />
    <path
      d="M15 14v-9"
      strokeWidth="2"
    />
    <path
      d="M18 14v-11"
      stroke="var(--primary)"
      strokeWidth="2"
    />
  </svg>
)

// 3. Academic Calendar: Calendar sheet with circular clock orbital overlay
export const CalendarIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Calendar card */}
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2.5"
      fill="currentColor"
      fillOpacity="0.1"
    />
    <path d="M16 2v4M8 2v4M3 9h18" />
    {/* Time indicator overlay at bottom right */}
    <circle
      cx="14"
      cy="14"
      r="4.5"
      fill="var(--background)"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M14 12v2l1.5 1"
      stroke="var(--primary)"
      strokeWidth="1.5"
    />
  </svg>
)

// 4. Fees & Payments: Credit card base with currency dynamic transaction flows
export const FeesPaymentsIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Credit card */}
    <rect
      x="3"
      y="5"
      width="18"
      height="13"
      rx="2"
      fill="currentColor"
      fillOpacity="0.1"
    />
    <path d="M3 9.5h18M7 13.5h2" />
    {/* Transaction flow path (curved arrow) */}
    <path
      d="M20.5 12a5.5 5.5 0 01-5.5 5.5"
      stroke="var(--primary)"
      strokeWidth="1.5"
      strokeDasharray="3 2"
    />
    <path
      d="M3.5 12a5.5 5.5 0 015.5-5.5"
      stroke="var(--primary)"
      strokeWidth="1.5"
      strokeDasharray="3 2"
    />
    <path d="M13 13.5h3" />
  </svg>
)

// 5. Exams & Timetable: Exam document outline with integrated clock badge
export const ExamsTimetableIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Exam Sheet with folded corner */}
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
      fill="currentColor"
      fillOpacity="0.08"
    />
    <path d="M14 2v6h6M8 13h4M8 17h7" />
    {/* Clock/time badge for exam schedule */}
    <circle
      cx="16"
      cy="14"
      r="3.5"
      fill="var(--background)"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M16 12.2v1.8h1.2"
      stroke="var(--primary)"
      strokeWidth="1.2"
    />
  </svg>
)

// 6. Portal Help: Key shape whose head is a chat/support bubble
export const PortalHelpIcon = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("w-full h-full", className)}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Key shaft & teeth */}
    <path d="M13.5 10.5L20 4v3h2v2h-2v2l-1.5 1.5-5-2z" />
    {/* Chat bubble head of the key */}
    <path
      d="M10.5 7.5c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    {/* Support question mark inside the chat bubble */}
    <path
      d="M9.5 10.5c0-.6.4-1 1-1s1 .4 1 1c0 .5-.4.7-.7 1"
      stroke="var(--primary)"
      strokeWidth="1.5"
    />
    <circle
      cx="10.5"
      cy="13.2"
      r="0.5"
      fill="var(--primary)"
    />
  </svg>
)
