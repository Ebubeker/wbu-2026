"use client"

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  currentImage?: string
  onUpload: (file: File) => Promise<void>
  onRemove?: () => void
  accept?: string
  maxSize?: number
}

export function ImageUpload({
  currentImage,
  onUpload,
  onRemove,
  accept = "image/*",
  maxSize = 2 * 1024 * 1024,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      if (accept !== "image/*") {
        const acceptedTypes = accept.split(",").map((t) => t.trim())
        if (!acceptedTypes.some((t) => file.type.match(t))) {
          return `File type "${file.type}" is not accepted. Accepted: ${accept}`
        }
      } else if (!file.type.startsWith("image/")) {
        return "Please select an image file."
      }
      if (file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(1)
        return `File is too large. Maximum size is ${maxMB}MB.`
      }
      return null
    },
    [accept, maxSize]
  )

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload
      setIsUploading(true)
      try {
        await onUpload(file)
      } catch {
        setError("Upload failed. Please try again.")
        setPreview(null)
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, validateFile]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    setPreview(null)
    setError(null)
    onRemove?.()
  }, [onRemove])

  const displayImage = preview || currentImage

  return (
    <div className="space-y-2">
      {displayImage ? (
        <div className="relative inline-block">
          <img
            src={displayImage}
            alt="Uploaded"
            className="h-32 w-32 rounded-lg object-cover border"
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              Change
            </Button>
            {onRemove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isUploading && "pointer-events-none opacity-50"
          )}
        >
          {isUploading ? (
            <Upload className="h-8 w-8 text-muted-foreground animate-pulse" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {isUploading
              ? "Uploading..."
              : "Drag & drop an image, or click to select"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
