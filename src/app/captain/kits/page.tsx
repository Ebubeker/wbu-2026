'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/common/PageHeader'
import { KitEditor } from '@/modules/kits/components/KitEditor'
import type { KitData } from '@/modules/kits/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CaptainKitsPage() {
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((user) => setTeamId(user.teamId))
  }, [])

  const { data: kits, mutate } = useSWR<KitData[]>(
    teamId ? `/api/kits?teamId=${teamId}` : null,
    fetcher
  )

  if (!teamId) return null

  const homeKit = kits?.find((k) => k.type === 'HOME') ?? null
  const awayKit = kits?.find((k) => k.type === 'AWAY') ?? null

  async function handleSave(data: {
    teamId: string
    type: 'HOME' | 'AWAY'
    primaryColor: string
    secondaryColor: string
    pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  }) {
    await fetch('/api/kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    mutate()
  }

  return (
    <div>
      <PageHeader
        title="Team Kits"
        description="Design your home and away kits"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <KitEditor teamId={teamId} type="HOME" kit={homeKit} onSave={handleSave} />
        <KitEditor teamId={teamId} type="AWAY" kit={awayKit} onSave={handleSave} />
      </div>
    </div>
  )
}
