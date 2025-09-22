import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    
    // For now, return sample flashcards
    // In production, implement proper PDF storage and processing
    
    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
    const openai = new OpenAI({ apiKey })
    
    // Generate sample flashcards
    const prompt = `Generate 5 educational flashcards about general knowledge. Each flashcard should have a clear question and a comprehensive answer.

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
