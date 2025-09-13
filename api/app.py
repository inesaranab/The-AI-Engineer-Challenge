# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel, Field
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
import json
from typing import Optional, List, Dict, Any

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

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
    model: Optional[str] = "gpt-4o-mini"  # Optional model selection with default
    api_key: str = Field(..., min_length=20, description="OpenAI API key for authentication")  # OpenAI API key for authentication
    use_structured_output: Optional[bool] = True  # Enable structured output parsing

# Define structured output models for reliable parsing
class CodeBlock(BaseModel):
    language: str = Field(description="Programming language")
    code: str = Field(description="The actual code content")

class ListItem(BaseModel):
    content: str = Field(description="List item content")
    level: int = Field(default=0, description="Nesting level (0 for top-level)")

class SummaryInfo(BaseModel):
    """Structured summary information for better summarization tasks"""
    main_topic: str = Field(description="The main topic or subject being discussed")
    key_points: List[str] = Field(description="3-5 key points or takeaways")
    conclusion: Optional[str] = Field(default=None, description="Main conclusion or final thought")
    who_what_where_when_why: Optional[Dict[str, str]] = Field(
        default=None, 
        description="5W analysis: who, what, where, when, why (only if applicable)"
    )

class StructuredResponse(BaseModel):
    content: str = Field(description="Main response content in markdown format")
    code_blocks: List[CodeBlock] = Field(default=[], description="Extracted code blocks")
    lists: List[ListItem] = Field(default=[], description="Extracted list items")
    summary: Optional[str] = Field(default=None, description="Brief summary of the response")
    structured_summary: Optional[SummaryInfo] = Field(default=None, description="Detailed structured summary for summarization tasks")
    answer: Optional[str] = Field(default=None, description="Direct answer if applicable")
    task_type: str = Field(default="general", description="Type of task: general, summarization, technical, creative, math, code")

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Validate API key format
        if not request.api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid API key format. OpenAI API keys should start with 'sk-'")
        
        if len(request.api_key) < 20:
            raise HTTPException(status_code=400, detail="API key appears to be too short. Please check your OpenAI API key.")
        
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=request.api_key)
        
        if request.use_structured_output:
            # Use structured output with response_format for reliable parsing
            try:
                response = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": f"""You are a helpful AI assistant. Provide responses in the structured format requested.

## Task-Specific Instructions:

### For Summarization Tasks:
- Set task_type to "summarization"
- Provide a structured_summary with:
  - main_topic: The primary subject
  - key_points: 3-5 essential takeaways
  - conclusion: Main conclusion or final thought
  - who_what_where_when_why: 5W analysis if applicable
- Keep content concise (3-4 sentences max)
- Focus on who/what/where/when/why without extra background

### For Technical Tasks:
- Set task_type to "technical"
- Use 1 simple analogy + 1 concrete example
- Define jargon in plain words
- Extract code_blocks when applicable

### For General Tasks:
- Set task_type to "general"
- Use clean markdown formatting
- Provide direct answers when applicable

Developer context: {request.developer_message}"""},
                    {"role": "user", "content": request.user_message}
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "structured_response",
                        "schema": StructuredResponse.model_json_schema(),
                        "strict": False
                    }
                }
            )
            
                # Parse the structured response
                try:
                    structured_data = json.loads(response.choices[0].message.content)
                    parsed_response = StructuredResponse(**structured_data)
                except json.JSONDecodeError as e:
                    raise HTTPException(status_code=500, detail=f"Failed to parse JSON response: {str(e)}")
                except Exception as e:
                    raise HTTPException(status_code=500, detail=f"Failed to create structured response: {str(e)}")
                
                # Return the markdown content with proper headers
                return StreamingResponse(
                    iter([parsed_response.content]), 
                    media_type="text/markdown",
                    headers={"Content-Type": "text/markdown; charset=utf-8"}
                )
            except Exception as structured_error:
                # Fallback to streaming if structured output fails
                print(f"Structured output failed, falling back to streaming: {structured_error}")
                # Continue to streaming fallback below
        else:
            # Fallback to streaming response (original behavior)
            async def generate():
                stream = client.chat.completions.create(
                    model=request.model,
                    messages=[
                        {"role": "system", "content": f"""You are a helpful AI assistant. Follow these formatting rules in ALL your responses:

## Output Style Rules:
- Use clean **Markdown**: short paragraphs, headings when helpful, and tidy bullet/numbered lists
- Default to **concise answers (≤ 4 sentences)** unless the user asks for more
- Put the final result on its own line, prefixed with **Answer:** when relevant
- **No LaTeX** in user-visible output; use plain-text math
- Default language: **English** unless the user requests otherwise

## Task-Specific Guidance:
- **Technical explanations:** Use 1 simple analogy + 1 concrete example; define any jargon in plain words
- **Summarization:** 3–4 sentences max covering **who/what/where/when/why**; avoid extra background; don't invent facts
- **Creative writing:** Respect requested length; prefer readability over heavy adjectives; use clear paragraph breaks
- **Math/logic:** Show minimal reasoning (one short step) and the final numeric answer; keep it tight
- **Style rewriting (to professional/formal):** Preserve meaning, shorten sentences, remove slang/redundancy

## Formatting for Code:
- Use fenced code blocks with a language tag
- Provide minimal, runnable snippets and brief comments; avoid unnecessary imports

Developer context: {request.developer_message}"""},
                        {"role": "user", "content": request.user_message}
                    ],
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content

            return StreamingResponse(
                generate(), 
                media_type="text/markdown",
                headers={"Content-Type": "text/markdown; charset=utf-8"}
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions (like our API key validation)
        raise
    except Exception as e:
        # Handle OpenAI API errors specifically
        error_message = str(e)
        if "Invalid API key" in error_message or "Incorrect API key" in error_message:
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key. Please check your API key and try again.")
        elif "Rate limit" in error_message:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        elif "Insufficient quota" in error_message:
            raise HTTPException(status_code=402, detail="Insufficient API quota. Please check your OpenAI account billing.")
        else:
            # Handle any other errors that occur during processing
            raise HTTPException(status_code=500, detail=f"An error occurred: {error_message}")

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Define a simple test endpoint
@app.post("/api/test")
async def test_endpoint(request: dict):
    """Simple test endpoint to verify API connectivity"""
    try:
        api_key = request.get("api_key", "")
        if not api_key:
            return {"error": "API key is required"}
        
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        
        return {
            "status": "success",
            "message": "API key is working",
            "response": response.choices[0].message.content
        }
    except Exception as e:
        return {"error": str(e)}

# Define an API key validation endpoint
@app.post("/api/validate-key")
async def validate_api_key(request: dict):
    """Validate OpenAI API key format and basic connectivity"""
    try:
        api_key = request.get("api_key", "")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="API key is required")
        
        if not api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid API key format. OpenAI API keys should start with 'sk-'")
        
        if len(api_key) < 20:
            raise HTTPException(status_code=400, detail="API key appears to be too short. Please check your OpenAI API key.")
        
        # Test the API key with a simple request
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        
        return {
            "status": "valid",
            "message": "API key is valid and working",
            "model_tested": "gpt-3.5-turbo"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        if "Invalid API key" in error_message or "Incorrect API key" in error_message:
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key. Please check your API key and try again.")
        elif "Rate limit" in error_message:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        elif "Insufficient quota" in error_message:
            raise HTTPException(status_code=402, detail="Insufficient API quota. Please check your OpenAI account billing.")
        else:
            raise HTTPException(status_code=500, detail=f"API key validation failed: {error_message}")

# Define an endpoint to get structured response data
@app.post("/api/chat/structured")
async def chat_structured(request: ChatRequest):
    """Endpoint that returns both markdown content and structured data"""
    try:
        # Validate API key format
        if not request.api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid API key format. OpenAI API keys should start with 'sk-'")
        
        if len(request.api_key) < 20:
            raise HTTPException(status_code=400, detail="API key appears to be too short. Please check your OpenAI API key.")
        
        client = OpenAI(api_key=request.api_key)
        
        response = client.chat.completions.create(
            model=request.model,
            messages=[
                {"role": "system", "content": f"""You are a helpful AI assistant. Provide responses in the structured format requested.

## Task-Specific Instructions:

### For Summarization Tasks:
- Set task_type to "summarization"
- Provide a structured_summary with:
  - main_topic: The primary subject
  - key_points: 3-5 essential takeaways
  - conclusion: Main conclusion or final thought
  - who_what_where_when_why: 5W analysis if applicable
- Keep content concise (3-4 sentences max)
- Focus on who/what/where/when/why without extra background

### For Technical Tasks:
- Set task_type to "technical"
- Use 1 simple analogy + 1 concrete example
- Define jargon in plain words
- Extract code_blocks when applicable

### For General Tasks:
- Set task_type to "general"
- Use clean markdown formatting
- Provide direct answers when applicable

Developer context: {request.developer_message}"""},
                {"role": "user", "content": request.user_message}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "structured_response",
                    "schema": StructuredResponse.model_json_schema(),
                    "strict": False
                }
            }
        )
        
        # Parse the structured response
        try:
            structured_data = json.loads(response.choices[0].message.content)
            parsed_response = StructuredResponse(**structured_data)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse JSON response: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create structured response: {str(e)}")
        
        # Return both the structured data and markdown content
        return {
            "content": parsed_response.content,
            "structured_data": parsed_response.model_dump(),
            "code_blocks": [block.model_dump() for block in parsed_response.code_blocks],
            "lists": [item.model_dump() for item in parsed_response.lists],
            "summary": parsed_response.summary,
            "structured_summary": parsed_response.structured_summary.model_dump() if parsed_response.structured_summary else None,
            "answer": parsed_response.answer,
            "task_type": parsed_response.task_type
        }
    
    except HTTPException:
        # Re-raise HTTP exceptions (like our API key validation)
        raise
    except Exception as e:
        # Handle OpenAI API errors specifically
        error_message = str(e)
        if "Invalid API key" in error_message or "Incorrect API key" in error_message:
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key. Please check your API key and try again.")
        elif "Rate limit" in error_message:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        elif "Insufficient quota" in error_message:
            raise HTTPException(status_code=402, detail="Insufficient API quota. Please check your OpenAI account billing.")
        else:
            # Handle any other errors that occur during processing
            raise HTTPException(status_code=500, detail=f"An error occurred: {error_message}")

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
