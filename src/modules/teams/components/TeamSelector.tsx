'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TeamSelectorProps {
  teams: Array<{ id: string; name: string; shortName: string }>
  value?: string
  onChange: (id: string) => void
  placeholder?: string
  excludeIds?: string[]
}

export function TeamSelector({
  teams,
  value,
  onChange,
  placeholder = 'Select a team',
  excludeIds = [],
}: TeamSelectorProps) {
  const filteredTeams = teams.filter((t) => !excludeIds.includes(t.id))

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filteredTeams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name} ({team.shortName})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
