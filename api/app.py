# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import PyPDF2
import io
import asyncio
from typing import Optional
from aimakerspace.vectordatabase import VectorDatabase
from aimakerspace.text_utils import CharacterTextSplitter
from aimakerspace.openai_utils.embedding import EmbeddingModel

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Global variables for RAG system
vector_db = None
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
    api_key: str          # OpenAI API key for authentication

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

async def build_rag_system(text: str, api_key: str) -> VectorDatabase:
    """Build RAG system from PDF text using aimakerspace"""
    try:
        # Set the API key for the embedding model
        os.environ["OPENAI_API_KEY"] = api_key
        
        # Split text into chunks
        splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split(text)
        
        # Create vector database
        embedding_model = EmbeddingModel()
        vector_db = VectorDatabase(embedding_model)
        
        # Build embeddings for chunks
        await vector_db.abuild_from_list(chunks)
        
        return vector_db
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error building RAG system: {str(e)}")

# PDF Upload endpoint
@app.post("/api/upload-pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), api_key: str = ""):
    global vector_db, pdf_text
    
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
        
        # Build RAG system using aimakerspace
        vector_db = await build_rag_system(pdf_text, api_key)
        
        return UploadResponse(
            message=f"PDF uploaded successfully! Extracted {len(pdf_text)} characters and built vector database.",
            success=True
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    global vector_db
    
    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # If we have a vector database (PDF uploaded), use RAG
            if vector_db is not None:
                # Search for relevant context using aimakerspace
                relevant_chunks = vector_db.search_by_text(request.user_message, k=3, return_as_text=True)
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
