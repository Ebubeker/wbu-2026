"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/common/ImageUpload"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function CaptainTeamPage() {
  const { data: user } = useSWR("/api/auth/me", fetcher)
  const { data: team, mutate } = useSWR(
    user?.teamId ? `/api/teams/${user.teamId}` : null,
    fetcher
  )

  const [name, setName] = useState("")
  const [shortName, setShortName] = useState("")
  const [description, setDescription] = useState("")
  const [logo, setLogo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (team) {
      setName(team.name || "")
      setShortName(team.shortName || "")
      setDescription(team.description || "")
      setLogo(team.logo || null)
    }
  }, [team])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, shortName, description, logo }),
      })
      if (res.ok) {
        toast.success("Team info updated successfully")
        mutate()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update")
      }
    } catch {
      toast.error("Failed to update team")
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("directory", "teams")
    const res = await fetch("/api/uploads", { method: "POST", body: formData })
    if (res.ok) {
      const { url } = await res.json()
      setLogo(url)
    }
  }

  if (!team)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Edit Team Info"
        description="Update your team's name, logo, and description"
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name (2-4 characters)</Label>
            <Input
              id="shortName"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              maxLength={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description / Motto</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter your team's motto or description..."
            />
          </div>
          <div className="space-y-2">
            <Label>Team Logo</Label>
            <ImageUpload
              currentImage={logo || undefined}
              onUpload={handleLogoUpload}
              onRemove={() => setLogo(null)}
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !name || !shortName}
            className="w-full"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
