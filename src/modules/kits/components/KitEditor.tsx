'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { KitPreview } from './KitPreview'
import type { KitData } from '../types'
import { DEFAULT_KIT } from '../types'

interface KitEditorProps {
  teamId: string
  type: 'HOME' | 'AWAY'
  kit: KitData | null
  onSave: (data: {
    teamId: string
    type: 'HOME' | 'AWAY'
    primaryColor: string
    secondaryColor: string
    pattern: 'SOLID' | 'STRIPES' | 'CHECKERED' | 'GRADIENT'
  }) => Promise<void>
}

export function KitEditor({ teamId, type, kit, onSave }: KitEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(kit?.primaryColor ?? DEFAULT_KIT.primaryColor)
  const [secondaryColor, setSecondaryColor] = useState(kit?.secondaryColor ?? DEFAULT_KIT.secondaryColor)
  const [pattern, setPattern] = useState<KitData['pattern']>(kit?.pattern ?? DEFAULT_KIT.pattern)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({ teamId, type, primaryColor, secondaryColor, pattern })
      toast.success(`${type === 'HOME' ? 'Home' : 'Away'} kit saved`)
    } catch {
      toast.error('Failed to save kit')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{type === 'HOME' ? 'Home Kit' : 'Away Kit'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <KitPreview
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            pattern={pattern}
            number={10}
            size={140}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${type}-primary`}>Primary Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${type}-primary`}
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`${type}-secondary`}>Secondary Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id={`${type}-secondary`}
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="font-mono text-sm"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor={`${type}-pattern`}>Pattern</Label>
          <Select value={pattern} onValueChange={(v) => setPattern(v as KitData['pattern'])}>
            <SelectTrigger id={`${type}-pattern`} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SOLID">Solid</SelectItem>
              <SelectItem value="STRIPES">Stripes</SelectItem>
              <SelectItem value="CHECKERED">Checkered</SelectItem>
              <SelectItem value="GRADIENT">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Kit'}
        </Button>
      </CardContent>
    </Card>
  )
}
