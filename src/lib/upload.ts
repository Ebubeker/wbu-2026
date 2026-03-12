import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/constants'

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted types: ${ACCEPTED_IMAGE_TYPES.join(', ')}`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    }
  }

  return { valid: true }
}

export async function saveFile(
  file: File,
  directory: 'teams' | 'players'
): Promise<string> {
  const ext = path.extname(file.name) || '.jpg'
  const filename = `${uuidv4()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', directory)

  await fs.mkdir(uploadDir, { recursive: true })

  const filePath = path.join(uploadDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return `/uploads/${directory}/${filename}`
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), 'public', filePath)

  try {
    await fs.access(fullPath)
    await fs.unlink(fullPath)
  } catch {
    // File does not exist or cannot be accessed; silently ignore
  }
}
