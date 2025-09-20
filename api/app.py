# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import PyPDF2
import io
from typing import Optional

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Global variables for RAG system
pdf_chunks = []
pdf_text = ""

# Configure CORS (Cross-Origin Resource Sharing) middleware
# This allows the API to be accessed from different domains/origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from any origin
    allow_credentials=True,  # Allows cookies to be included in requests
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers in requests
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default

class UploadResponse(BaseModel):
    message: str
    success: bool

def extract_text_from_pdf(pdf_file: bytes) -> str:
    """Extract text from PDF file bytes"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_file))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text from PDF: {str(e)}")

def build_rag_system(text: str) -> list:
    """Build simple RAG system from PDF text"""
    try:
        # Simple text chunking
        chunk_size = 1000
        chunks = []
        
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size]
            chunks.append(chunk)
        
        return chunks
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building RAG system: {str(e)}")

def find_relevant_chunks(query: str, chunks: list, k: int = 3) -> list:
    """Simple keyword-based search for relevant chunks"""
    query_words = query.lower().split()
    chunk_scores = []
    
    for i, chunk in enumerate(chunks):
        chunk_lower = chunk.lower()
        score = sum(1 for word in query_words if word in chunk_lower)
        chunk_scores.append((i, score, chunk))
    
    # Sort by score and return top k
    chunk_scores.sort(key=lambda x: x[1], reverse=True)
    return [chunk for _, _, chunk in chunk_scores[:k]]

# PDF Upload endpoint
@app.post("/api/upload-pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), authorization: str = Header(None)):
    global pdf_chunks, pdf_text
    
    # Extract API key from Authorization header
    api_key = None
    if authorization and authorization.startswith('Bearer '):
        api_key = authorization[7:]  # Remove 'Bearer ' prefix
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read PDF file
        pdf_content = await file.read()
        
        # Extract text from PDF
        pdf_text = extract_text_from_pdf(pdf_content)
        
        if not pdf_text.strip():
            raise HTTPException(status_code=400, detail="No text found in PDF")
        
        # Build simple RAG system
        pdf_chunks = build_rag_system(pdf_text)
        
        return UploadResponse(
            message=f"PDF uploaded successfully! Extracted {len(pdf_text)} characters and created {len(pdf_chunks)} chunks.",
            success=True
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest, authorization: str = Header(None)):
    global pdf_chunks
    
    # Extract API key from Authorization header
    api_key = None
    if authorization and authorization.startswith('Bearer '):
        api_key = authorization[7:]  # Remove 'Bearer ' prefix
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # If we have PDF chunks (PDF uploaded), use RAG
            if pdf_chunks:
                # Search for relevant context using simple keyword matching
                relevant_chunks = find_relevant_chunks(request.user_message, pdf_chunks, k=3)
                context = "\n\n".join(relevant_chunks)
                
                # Create enhanced system message with context
                enhanced_system_message = f"""{request.developer_message}

IMPORTANT: You must ONLY answer questions using information from the provided context below. If the answer is not in the context, say "I don't have enough information in the provided document to answer that question."

Context from uploaded document:
{context}"""
                
                messages = [
                    {"role": "system", "content": enhanced_system_message},
                    {"role": "user", "content": request.user_message}
                ]
            else:
                # No PDF uploaded, use original behavior
                messages = [
                    {"role": "system", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ]
            
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=messages,
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)