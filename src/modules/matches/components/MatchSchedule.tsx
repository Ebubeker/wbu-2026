'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { Calendar } from 'lucide-react'
import { MatchCard } from './MatchCard'
import type { MatchData } from '../types'

interface MatchScheduleProps {
  matches: MatchData[]
  groups: Array<{ id: string; name: string }>
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function getRelativeLabel(date: Date) {
  const current = new Date()
  const today = new Date(current.getFullYear(), current.getMonth(), current.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffInDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Tomorrow'
  if (diffInDays === -1) return 'Yesterday'

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function MatchSchedule({ matches, groups }: MatchScheduleProps) {
  const [activeTab, setActiveTab] = useState('all')

  const filteredMatches = useMemo(() => {
    if (activeTab === 'all') return matches

    if (activeTab === 'knockouts') {
      return matches.filter((match) => match.stage !== 'GROUP')
    }

    return matches.filter((match) => match.groupId === activeTab)
  }, [matches, activeTab])

  const groupedMatches = useMemo(() => {
    const sections = new Map<string, MatchData[]>()

    filteredMatches.forEach((match) => {
      const matchDate = new Date(match.matchDate)
      const key = getDateKey(matchDate)
      const currentGroup = sections.get(key) ?? []
      currentGroup.push(match)
      sections.set(key, currentGroup)
    })

    return Array.from(sections.entries()).map(([key, groupMatches]) => {
      const sectionDate = new Date(groupMatches[0].matchDate)

      return {
        key,
        label: getRelativeLabel(sectionDate),
        date: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
        }).format(sectionDate),
        matches: groupMatches,
      }
    })
  }, [filteredMatches])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="overflow-x-auto pb-2">
        <TabsList className="w-max min-w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          {groups.map((group) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="knockouts">Knockouts</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="mt-5">
        {groupedMatches.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No matches found"
            description="There are no matches for this filter."
          />
        ) : (
          <div className="space-y-6">
            {groupedMatches.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{section.label}</p>
                    <p className="text-sm text-muted-foreground">{section.date}</p>
                  </div>
                  <Badge variant="outline">{section.matches.length} matches</Badge>
                </div>

                <div className="space-y-3">
                  {section.matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
