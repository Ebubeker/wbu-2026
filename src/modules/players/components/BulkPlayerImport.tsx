"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ClipboardPaste, Copy } from "lucide-react"
import { bulkImportPlayers } from "@/modules/players/actions"

interface BulkPlayerImportProps {
  teamId: string
  teamShortName: string
  onSuccess?: () => void
}

export function BulkPlayerImport({ teamId, teamShortName, onSuccess }: BulkPlayerImportProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    created: number
    captain?: { name: string; username: string; password: string }
  } | null>(null)

  async function handleImport() {
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await bulkImportPlayers(teamId, text)
      if (!res.success) {
        toast.error(res.error || "Import failed")
        return
      }
      toast.success(`${res.created} player${res.created !== 1 ? "s" : ""} imported`)
      setResult({ created: res.created, captain: res.captain })
      setText("")
      onSuccess?.()
    } catch {
      toast.error("Import failed")
    } finally {
      setLoading(false)
    }
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setResult(null)
      setText("")
    }
    setOpen(isOpen)
  }

  function copyCredentials() {
    if (!result?.captain) return
    const text = `Username: ${result.captain.username}\nPassword: ${result.captain.password}`
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardPaste className="h-4 w-4 mr-1" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Players — {teamShortName}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {result.created} player{result.created !== 1 ? "s" : ""} added successfully.
            </p>

            {result.captain && (
              <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2">
                <p className="text-sm font-semibold">Captain Account</p>
                <p className="text-sm text-muted-foreground">
                  {result.captain.name}
                </p>
                <div className="space-y-1 font-mono text-sm">
                  <p>Username: <span className="font-semibold text-foreground">{result.captain.username}</span></p>
                  <p>Password: <span className="font-semibold text-foreground">{result.captain.password}</span></p>
                </div>
                <Button variant="outline" size="sm" onClick={copyCredentials} className="mt-2">
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy credentials
                </Button>
              </div>
            )}

            <Button onClick={() => handleClose(false)} className="w-full">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste one player per line. Mark the captain with <span className="font-mono font-semibold">(C)</span>.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"John Doe (C)\nJane Smith\nBob Wilson\n..."}
              rows={10}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Jersey numbers auto-assigned. Positions default to MID (editable later).
            </p>
            <Button onClick={handleImport} disabled={loading || !text.trim()} className="w-full">
              {loading ? "Importing..." : "Import players"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
