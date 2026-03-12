'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Upload, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { updatePlayerPhoto } from '../actions'

interface PhotoUploadProps {
  playerId: string
  playerName: string
  currentPhoto?: string
  onUpload?: (photoUrl: string) => void
}

export function PhotoUpload({
  playerId,
  playerName,
  currentPhoto,
  onUpload,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const displayPhoto = preview ?? currentPhoto

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if (!selectedFile) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { url } = (await response.json()) as { url: string }

      const result = await updatePlayerPhoto(playerId, url)

      if (result.success) {
        toast.success('Photo updated successfully')
        setSelectedFile(null)
        setPreview(null)
        onUpload?.(url)
      } else {
        toast.error(result.error ?? 'Failed to update photo')
      }
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setIsUploading(false)
    }
  }

  function handleCancel() {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
        {displayPhoto ? (
          <Image
            src={displayPhoto}
            alt={playerName}
            fill
            className="object-cover"
          />
        ) : (
          <User className="h-10 w-10 text-muted-foreground" />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleUpload}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Save'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          {currentPhoto ? 'Change Photo' : 'Upload Photo'}
        </Button>
      )}
    </div>
  )
}
