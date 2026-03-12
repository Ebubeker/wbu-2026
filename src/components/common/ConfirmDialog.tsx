"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  variant?: "destructive" | "default"
  requireConfirmText?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  variant = "destructive",
  requireConfirmText,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("")

  const isConfirmEnabled = requireConfirmText
    ? inputValue === requireConfirmText
    : true

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setInputValue("")
    }
    onOpenChange(nextOpen)
  }

  function handleConfirm() {
    onConfirm()
    setInputValue("")
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requireConfirmText && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type{" "}
              <span className="font-semibold text-foreground">
                {requireConfirmText}
              </span>{" "}
              to confirm.
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireConfirmText}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
