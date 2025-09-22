import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    
    if (!file || !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }
    
    // Process PDF here or forward to external API
    // For now, return success
    return NextResponse.json({
      message: `PDF uploaded successfully! File: ${file.name}`,
      success: true
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
