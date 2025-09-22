import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

// Global variables for RAG system (serverless compatible)
let pdfChunks: string[] = []
let pdfText: string = ""

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    
    if (!pdfText.trim()) {
      return NextResponse.json({ error: 'No PDF uploaded. Please upload a PDF first.' }, { status: 400 })
    }
    
    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
    const openai = new OpenAI({ apiKey })
    
    // Generate flashcards from PDF content
    const prompt = `Based on the following document content, generate 5 educational flashcards. Each flashcard should have a clear question and a comprehensive answer.

Document content:
${pdfText}

Please format your response as a JSON array of objects with "question" and "answer" fields. Example:
[
  {"question": "What is...?", "answer": "The answer is..."},
  {"question": "How does...?", "answer": "It works by..."}
]`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an educational assistant that creates high-quality flashcards from document content.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }
    
    // Parse JSON response
    const flashcards = JSON.parse(content)
    
    return NextResponse.json({
      flashcards,
      success: true
    })
    
  } catch (error) {
    console.error('Flashcard generation error:', error)
    return NextResponse.json({ error: 'Flashcard generation failed' }, { status: 500 })
  }
}
