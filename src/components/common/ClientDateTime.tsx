'use client'

interface ClientDateTimeProps {
  date: string | Date
  format?: 'date' | 'time' | 'both'
}

export function ClientDateTime({ date, format = 'both' }: ClientDateTimeProps) {
  const d = new Date(date)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (format === 'date') return <>{dateStr}</>
  if (format === 'time') return <>{timeStr}</>
  return <>{dateStr} {timeStr}</>
}
