"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type MatchStatus =
  | "SCHEDULED"
  | "FIRST_HALF"
  | "HALF_TIME"
  | "SECOND_HALF"
  | "FULL_TIME"

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<
  MatchStatus,
  { label: string; className: string; pulse: boolean }
> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "border-border bg-muted text-muted-foreground",
    pulse: false,
  },
  FIRST_HALF: {
    label: "1st Half",
    className: "border-red-200 bg-red-50 text-red-600",
    pulse: true,
  },
  HALF_TIME: {
    label: "Half Time",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    pulse: false,
  },
  SECOND_HALF: {
    label: "2nd Half",
    className: "border-red-200 bg-red-50 text-red-600",
    pulse: true,
  },
  FULL_TIME: {
    label: "Full Time",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pulse: false,
  },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status as MatchStatus] || statusConfig.SCHEDULED

  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.pulse && (
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      )}
      {config.label}
    </Badge>
  )
}
