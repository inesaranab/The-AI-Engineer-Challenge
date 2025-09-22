import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

function findRelevantChunksKeyword(query: string, chunks: string[], k: number = 3): string[] {
  const queryWords = query.toLowerCase().split()
  const chunkScores: { chunk: string; score: number }[] = []
  
  for (const chunk of chunks) {
    const chunkLower = chunk.toLowerCase()
    const score = queryWords.reduce((acc, word) => {
      return acc + (chunkLower.includes(word) ? 1 : 0)
    }, 0)
    chunkScores.push({ chunk, score })
  }
  
  // Sort by score and return top k
  chunkScores.sort((a, b) => b.score - a.score)
  return chunkScores.slice(0, k).map(item => item.chunk)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_message, developer_message, model } = body
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }
    
    const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
    const openai = new OpenAI({ apiKey })
    
    let systemMessage = developer_message || "You are a helpful AI assistant."
    
    // For now, use basic chat without RAG
    // In production, implement proper storage and RAG
    
    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: model || 'gpt-4',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: user_message }
      ],
      stream: true
    })
    
    // Create a readable stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
