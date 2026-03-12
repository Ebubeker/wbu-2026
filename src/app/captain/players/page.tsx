"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { PageHeader } from "@/components/common/PageHeader"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { EmptyState } from "@/components/common/EmptyState"
import { Camera, Users } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Player {
  id: string
  name: string
  number: number
  position: string
  photo: string | null
}

const positionColors: Record<string, string> = {
  GK: "bg-amber-100 text-amber-800",
  DEF: "bg-blue-100 text-blue-800",
  MID: "bg-green-100 text-green-800",
  FWD: "bg-red-100 text-red-800",
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

  if (!players)
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Player Photos"
        description="Upload or change photos for your team's players"
      />

      <Card className="mt-6 mb-6">
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            You can upload or change player photos. To change player names,
            numbers, or positions, please contact the tournament admin.
          </p>
        </CardContent>
      </Card>

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
                    <Badge
                      variant="outline"
                      className={positionColors[player.position] || ""}
                    >
                      {player.position}
                    </Badge>
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
