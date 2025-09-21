'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Settings, Sparkles, Loader2, Upload, FileText, X, Plus, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  citations?: Array<{
    docName: string
    page: number
    snippet: string
  }>
}

interface Flashcard {
  question: string
  answer: string
}

// Flashcard Component
const FlashcardComponent: React.FC<{ 
  card: Flashcard, 
  onViewFull: (card: Flashcard) => void 
}> = ({ card, onViewFull }) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const handleViewFullClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onViewFull(card)
  }

  return (
    <div 
      className="relative w-80 h-48 sm:w-full perspective-1000 flashcard-container transition-all duration-300"
    >
      <div 
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 0.7s ease-in-out'
        }}
      >
        {/* Front of card (Question) */}
        <div 
          className="absolute w-full h-full bg-gray-900 border border-gray-700 rounded-lg shadow-md font-mono backface-hidden cursor-pointer"
          style={{ backfaceVisibility: 'hidden' }}
          onClick={handleCardClick}
        >
          <div className="flex flex-col items-center justify-center text-center h-full p-4">
            <div className="text-green-400 font-bold mb-3 text-sm">Q:</div>
            <div className="text-gray-100 text-sm leading-relaxed overflow-auto flex-1 flex items-center justify-center max-h-24">
              <span className="line-clamp-6">{card.question}</span>
            </div>
            <div className="text-gray-500 text-xs mt-2">
              Click to reveal answer
            </div>
          </div>
        </div>

        {/* Back of card (Answer Preview) */}
        <div 
          className="absolute w-full h-full bg-gray-900 border border-gray-700 rounded-lg shadow-md font-mono backface-hidden rotate-y-180"
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          <div className="flex flex-col items-center justify-center text-center h-full p-4">
            <div className="text-blue-400 font-bold mb-3 text-sm">A:</div>
            <div className="text-gray-100 text-sm leading-relaxed overflow-auto flex-1 flex items-center justify-center max-h-16">
              <span className="line-clamp-4">{card.answer}</span>
            </div>
            <button
              onClick={handleViewFullClick}
              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              View Full Answer
            </button>
            <div className="text-gray-500 text-xs mt-1">
              Click to see question
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Get API URL from environment or default to localhost
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin for API calls
    return `${window.location.origin}/api`
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [developerMessage, setDeveloperMessage] = useState('You are a helpful AI assistant.')
  const [model, setModel] = useState('gpt-4.1-mini')
  const [showSettings, setShowSettings] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false)
  const [showFlashcards, setShowFlashcards] = useState(false)
  const [selectedFlashcard, setSelectedFlashcard] = useState<Flashcard | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [studyMode, setStudyMode] = useState(true)
  const [selectedText, setSelectedText] = useState('')
  const [showAddFlashcard, setShowAddFlashcard] = useState(false)
  const [addFlashcardPosition, setAddFlashcardPosition] = useState({ x: 0, y: 0 })
  const [studyProgress, setStudyProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textSelectionRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleClickOutside = () => {
      setShowAddFlashcard(false)
    }
    
    if (showAddFlashcard) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showAddFlashcard])

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setUploadStatus('Please select a PDF file')
      return
    }

    if (!apiKey.trim()) {
      setUploadStatus('Please set your API key first')
      return
    }

    setIsUploading(true)
    setUploadStatus('Uploading and processing PDF...')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const result = await response.json()
      setUploadedFile(file)
      setUploadStatus(result.message)
      // Clear previous flashcards when new PDF is uploaded
      setFlashcards([])
      setShowFlashcards(false)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const removeUploadedFile = () => {
    setUploadedFile(null)
    setUploadStatus('')
    setFlashcards([])
    setShowFlashcards(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const generateFlashcards = async () => {
    if (!apiKey.trim()) {
      alert('Please set your API key first')
      return
    }

    setIsGeneratingFlashcards(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/flashcards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to generate flashcards')
      }

      const result = await response.json()
      setFlashcards(result.flashcards)
      setShowFlashcards(true)
    } catch (error) {
      console.error('Flashcard generation error:', error)
      alert(`Error generating flashcards: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingFlashcards(false)
    }
  }

  const handleViewFull = (card: Flashcard) => {
    setSelectedFlashcard(card)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedFlashcard(null)
  }

  const handleTextSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      setSelectedText(selection.toString())
      setAddFlashcardPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      })
      setShowAddFlashcard(true)
    } else {
      setShowAddFlashcard(false)
    }
  }

  const handleAddFlashcard = (text: string) => {
    // Create a simple flashcard from selected text
    const newFlashcard: Flashcard = {
      question: `What does this mean: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"?`,
      answer: text
    }
    setFlashcards(prev => [...prev, newFlashcard])
    setShowAddFlashcard(false)
    setSelectedText('')
  }

  const handleCardGrading = (grade: 1 | 2 | 3) => {
    setStudyProgress(prev => prev + 1)
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1)
    } else {
      setCurrentCardIndex(0)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === '1') handleCardGrading(1)
    if (e.key === '2') handleCardGrading(2)
    if (e.key === '3') handleCardGrading(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !apiKey.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          developer_message: developerMessage,
          user_message: inputMessage,
          model: model,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      let aiResponse = ''
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        aiResponse += chunk

        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: aiResponse }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, there was an error processing your request. Please check your API key and try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur border-b">
        <div className="max-w-[1200px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center relative">
              <div className="w-5 h-5 bg-amber-200 rounded-full relative">
                <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-amber-800 rounded-full"></div>
                <div className="absolute top-1 right-0.5 w-0.5 h-0.5 bg-amber-800 rounded-full"></div>
                <div className="absolute bottom-0.5 left-1 w-0.5 h-0.5 bg-amber-800 rounded-full"></div>
                <div className="absolute bottom-1 right-1 w-0.5 h-0.5 bg-amber-800 rounded-full"></div>
              </div>
            </div>
            <h1 className="text-lg font-bold gradient-text">CookiesPDF</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateFlashcards}
              disabled={isGeneratingFlashcards || !apiKey.trim() || !uploadedFile}
              className="rounded-xl px-4 py-2 font-medium shadow-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isGeneratingFlashcards ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate Flashcards</span>
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Developer Message (System Prompt)
                </label>
                <textarea
                  value={developerMessage}
                  onChange={(e) => setDeveloperMessage(e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
              
              {/* PDF Upload Section */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload PDF for RAG Chat
                </label>
                
                {!uploadedFile ? (
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload a PDF file
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        The AI will only answer questions using information from this document
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-blue-600">
                            Ready for RAG chat
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeUploadedFile}
                        className="p-1 hover:bg-blue-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                )}
                
                {uploadStatus && (
                  <div className={`mt-2 text-sm ${
                    uploadStatus.includes('successfully') 
                      ? 'text-green-600' 
                      : uploadStatus.includes('failed') || uploadStatus.includes('Please')
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}>
                    {uploadStatus}
                  </div>
                )}
                
                {isUploading && (
                  <div className="flex items-center space-x-2 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-blue-600">Processing PDF...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Welcome to CookiesPDF!
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Upload a PDF to start learning with AI-powered chat and flashcards. Make sure to set up your API key in the settings above.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${
                message.role === 'user' ? 'user-bubble' : 'ai-bubble'
              } animate-fade-in`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-gray-100'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </p>
                  <div 
                    className={`prose prose-sm max-w-none ${
                      message.role === 'assistant' ? 'max-w-[680px] mx-auto prose-slate' : ''
                    }`}
                    onMouseUp={message.role === 'assistant' ? handleTextSelection : undefined}
                    style={{ userSelect: message.role === 'assistant' ? 'text' : 'none' }}
                  >
                    {message.content.split('\n').map((line, index) => (
                      <p key={index} className="mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                  
                  {/* Citation chips for assistant messages */}
                  {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.citations.slice(0, 3).map((citation, index) => (
                        <div key={index} className="relative group">
                          <div className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
                            <span className="text-slate-700">
                              {citation.docName} (p. {citation.page})
                            </span>
                          </div>
                          {/* Hover popover */}
                          <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                            <div className="text-xs text-gray-600 line-clamp-4">
                              {citation.snippet.length > 180 
                                ? `${citation.snippet.substring(0, 180)}...` 
                                : citation.snippet
                              }
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="chat-bubble ai-bubble animate-fade-in">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">AI Assistant</p>
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                    <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Study Mode Panel */}
      {showFlashcards && flashcards.length > 0 && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-30">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Study Mode</h3>
              <button
                onClick={() => setShowFlashcards(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{studyProgress} / {flashcards.length}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(studyProgress / flashcards.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Study Card */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center">
              {flashcards.length > 0 && (
                <div className="w-full max-w-sm">
                  <div 
                    className="study-card relative w-full h-64 bg-white border border-gray-200 rounded-2xl shadow-sm cursor-pointer transition-transform duration-300 hover:shadow-md"
                    onClick={() => {
                      const card = document.querySelector('.study-card')
                      if (card) {
                        card.classList.toggle('flipped')
                      }
                    }}
                  >
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center backface-hidden">
                      <div className="text-blue-600 font-bold mb-3 text-sm">Q:</div>
                      <div className="text-gray-800 text-sm leading-relaxed">
                        {flashcards[currentCardIndex]?.question}
                      </div>
                    </div>
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl rotate-y-180 backface-hidden">
                      <div className="text-green-600 font-bold mb-3 text-sm">A:</div>
                      <div className="text-gray-800 text-sm leading-relaxed">
                        {flashcards[currentCardIndex]?.answer}
                      </div>
                    </div>
                  </div>
                  
                  {/* Grading Buttons */}
                  <div className="mt-6 space-y-3">
                    <div className="text-sm text-gray-600 text-center mb-3">
                      How well did you know this?
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCardGrading(1)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Knew (1)</span>
                      </button>
                      <button
                        onClick={() => handleCardGrading(2)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Unsure (2)</span>
                      </button>
                      <button
                        onClick={() => handleCardGrading(3)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Didn't know (3)</span>
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-2">
                      Use keyboard shortcuts: 1, 2, or 3
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="sticky bottom-0 bg-white/70 backdrop-blur border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
                disabled={isLoading || !apiKey.trim()}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim() || !apiKey.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>Send</span>
            </button>
          </form>
          
          {!apiKey.trim() && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              Please set your OpenAI API key in the settings to start chatting
            </p>
          )}
        </div>
      </div>

      {/* Floating Add Flashcard Button */}
      {showAddFlashcard && selectedText && (
        <div
          className="fixed z-50"
          style={{
            left: `${addFlashcardPosition.x}px`,
            top: `${addFlashcardPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddFlashcard(selectedText)
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Flashcard</span>
          </button>
        </div>
      )}

      {/* Flashcard Modal */}
      {showModal && selectedFlashcard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100">Flashcard Details</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* Question */}
              <div className="mb-6">
                <div className="text-green-400 font-bold mb-3 text-sm">Question:</div>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 font-mono text-gray-100 text-sm leading-relaxed">
                  {selectedFlashcard.question}
                </div>
              </div>
              
              {/* Answer */}
              <div>
                <div className="text-blue-400 font-bold mb-3 text-sm">Answer:</div>
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 font-mono text-gray-100 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedFlashcard.answer}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end p-4 border-t border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 