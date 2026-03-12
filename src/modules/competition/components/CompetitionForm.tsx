'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/common/ImageUpload'
import { updateCompetition } from '../actions'
import type { CompetitionData } from '../types'

interface CompetitionFormProps {
  initialData: CompetitionData | null
}

export function CompetitionForm({ initialData }: CompetitionFormProps) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [season, setSeason] = useState(initialData?.season ?? '')
  const [description, setDescription] = useState(
    initialData?.description ?? ''
  )
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl ?? '')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await updateCompetition({
        name,
        season,
        description: description || undefined,
        logoUrl: logoUrl || undefined,
      })

      if (result.success) {
        toast.success('Competition updated successfully')
      } else {
        toast.error(result.error || 'Failed to update competition')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Competition Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter competition name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="season">Season</Label>
        <Input
          id="season"
          type="text"
          placeholder="Enter season"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter competition description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label>Logo</Label>
        <ImageUpload
          currentImage={logoUrl || undefined}
          onUpload={async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('directory', 'teams')
            const res = await fetch('/api/uploads', { method: 'POST', body: formData })
            if (res.ok) {
              const { url } = await res.json()
              setLogoUrl(url)
            }
          }}
          onRemove={() => setLogoUrl('')}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
