"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Users } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Player {
  id: string
  name: string
  number: number
  position: string
  photo: string | null
}

export default function CaptainPlayersPage() {
  const { data: user } = useSWR("/api/auth/me", fetcher)
  const { data: players, mutate } = useSWR<Player[]>(
    user?.teamId ? `/api/players?teamId=${user.teamId}` : null,
    fetcher
  )
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handlePhotoUpload = async (
    playerId: string,
    playerName: string,
    file: File
  ) => {
    setUploading(playerId)
    try {
      // Upload file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("directory", "players")
      const uploadRes = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      })
      if (!uploadRes.ok) {
        toast.error("Failed to upload photo")
        return
      }
      const { url } = await uploadRes.json()

      // Update player photo
      const updateRes = await fetch(`/api/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: url }),
      })
      if (updateRes.ok) {
        toast.success(`${playerName}'s photo updated`)
        mutate()
      } else {
        toast.error("Failed to update player photo")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setUploading(null)
    }
  }

  const handlePositionChange = async (playerId: string, playerName: string, position: string) => {
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      })
      if (res.ok) {
        toast.success(`${playerName} moved to ${position}`)
        mutate()
      } else {
        toast.error("Failed to update position")
      }
    } catch {
      toast.error("Something went wrong")
    }
  }

  if (!players)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Players"
        description="Manage photos and positions for your team's players"
      />

      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Players"
          description="No players have been added to your team yet."
        />
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <Card key={player.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <Avatar className="h-16 w-16">
                  {player.photo ? (
                    <AvatarImage src={player.photo} alt={player.name} />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {player.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{player.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">
                      #{player.number}
                    </span>
                    <Select
                      value={player.position}
                      onValueChange={(val) => handlePositionChange(player.id, player.name, val)}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GK">GK</SelectItem>
                        <SelectItem value="DEF">DEF</SelectItem>
                        <SelectItem value="MID">MID</SelectItem>
                        <SelectItem value="FWD">FWD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    ref={(el) => {
                      fileInputRefs.current[player.id] = el
                    }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file)
                        handlePhotoUpload(player.id, player.name, file)
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[player.id]?.click()}
                    disabled={uploading === player.id}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    {uploading === player.id
                      ? "Uploading..."
                      : player.photo
                        ? "Change"
                        : "Upload"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
