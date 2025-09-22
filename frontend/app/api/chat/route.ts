import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from 'openai'

// Global variables for RAG system (serverless compatible)
let pdfChunks: string[] = []
let pdfText: string = ""

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
    
    // If we have PDF chunks, use RAG
    if (pdfChunks.length > 0) {
      const relevantChunks = findRelevantChunksKeyword(user_message, pdfChunks, 3)
      const context = relevantChunks.join('\n\n')
      
      systemMessage = `${systemMessage}

IMPORTANT: You must ONLY answer questions using information from the provided context below. If the answer is not in the context, say "I don't have enough information in the provided document to answer that question."

Context:
${context}`
    }
    
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
