import { NextRequest, NextResponse } from "next/server"
import { saveFile, validateFile } from "@/lib/upload"
import { getSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const directory = (formData.get('directory') as string) || 'teams'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const url = await saveFile(file, directory as 'teams' | 'players')
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
