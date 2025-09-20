# PDF RAG System - Merge Instructions

This document provides instructions for merging the PDF RAG functionality back to the main branch and deploying the application.

## Changes Made

### Backend (API)
- Added PDF upload endpoint (`/api/upload-pdf`)
- Added PDF text extraction using PyPDF2
- Implemented simple RAG system with keyword-based search
- Updated chat endpoint to use RAG context when PDF is uploaded
- Added PyPDF2 dependency to requirements.txt

### Frontend
- Added PDF upload UI in settings panel
- Added file upload handling with drag-and-drop interface
- Added upload status indicators
- Updated welcome message to mention PDF functionality
- Added new icons for file operations

### Dependencies Added
- PyPDF2==3.0.1 (PDF text extraction)

## Deployment Instructions

### Option 1: GitHub Pull Request (Recommended)

1. **Push the feature branch to GitHub:**
   ```bash
   git push origin feature/pdf-rag-system
   ```

2. **Create a Pull Request:**
   - Go to your GitHub repository
   - Click "Compare & pull request" for the `feature/pdf-rag-system` branch
   - Add a descriptive title: "Add PDF Upload and RAG Chat Functionality"
   - Add description of the changes
   - Assign reviewers if needed
   - Click "Create pull request"

3. **Merge the Pull Request:**
   - Review the changes
   - Click "Merge pull request"
   - Delete the feature branch after merging

4. **Deploy to Vercel:**
   - Vercel will automatically detect the changes and redeploy
   - Monitor the deployment in your Vercel dashboard
   - **Set Environment Variable**: Add `OPENAI_API_KEY` for the backend

### Option 2: GitHub CLI

1. **Push the feature branch:**
   ```bash
   git push origin feature/pdf-rag-system
   ```

2. **Create and merge PR using GitHub CLI:**
   ```bash
   # Create pull request
   gh pr create --title "Add PDF Upload and RAG Chat Functionality" --body "Implements PDF upload and RAG-based chat using simple keyword matching"
   
   # Merge the pull request
   gh pr merge --squash
   ```

3. **Switch back to main and pull changes:**
   ```bash
   git checkout main
   git pull origin main
   ```

4. **Deploy to Vercel:**
   - Vercel will automatically redeploy from the main branch

## Testing the Deployment

After deployment, test the following features:

1. **Basic Chat:**
   - Set OpenAI API key in settings
   - Send a message without uploading PDF
   - Verify normal chat functionality

2. **PDF Upload:**
   - Upload a PDF file in settings
   - Verify successful upload message
   - Check that file appears in the UI

3. **RAG Chat:**
   - Ask questions about the uploaded PDF content
   - Verify responses are based on PDF content
   - Test with questions not in the PDF (should get "I don't have enough information" response)

## Environment Variables

### For Vercel (Both Frontend and Backend):
- `OPENAI_API_KEY`: Your OpenAI API key (for production use)

## File Structure

```
The-AI-Engineer-Challenge/
├── api/
│   ├── app.py (updated with RAG functionality)
│   └── requirements.txt (added PyPDF2)
├── frontend/
│   └── app/page.tsx (updated with PDF upload UI)
└── vercel.json (unchanged - original configuration)
```

## Local Development

For local testing, run:
```bash
# Backend
cd api
pip install -r requirements.txt
python app.py

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

## Notes

- Uses simple keyword-based RAG instead of vector embeddings for Vercel compatibility
- PDF processing happens server-side for security
- RAG system uses in-memory storage (resets on server restart)
- **Frontend and Backend deploy together on Vercel** - this is the original working configuration