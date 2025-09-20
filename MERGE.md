# PDF RAG System - Merge Instructions

This document provides instructions for merging the PDF RAG functionality back to the main branch and deploying the application.

## Changes Made

### Backend (API)
- Added PDF upload endpoint (`/api/upload-pdf`)
- Integrated aimakerspace library for RAG functionality
- Updated chat endpoint to use RAG context when PDF is uploaded
- Added PDF text extraction using PyPDF2
- Added vector database for semantic search
- Updated dependencies in `requirements.txt`

### Frontend
- Added PDF upload UI in settings panel
- Added file upload handling with drag-and-drop interface
- Added upload status indicators
- Updated welcome message to mention PDF functionality
- Added new icons for file operations

### Dependencies Added
- PyPDF2==3.0.1 (PDF text extraction)
- numpy==1.21.6 (Vector operations - Vercel compatible)
- python-dotenv==1.0.0 (Environment variables)

## 🚨 Vercel Deployment Fix

**IMPORTANT**: The `vercel.json` has been optimized for Vercel's Python runtime with proper configuration for numpy and aimakerspace.

### Key Changes for Vercel Compatibility:
1. **Updated `vercel.json`**: Added maxLambdaSize and maxDuration configurations
2. **Optimized numpy version**: Using numpy==1.21.6 (compatible with Vercel)
3. **Added `.vercelignore`**: Excludes unnecessary files from deployment
4. **Kept aimakerspace**: Full RAG functionality preserved

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
   gh pr create --title "Add PDF Upload and RAG Chat Functionality" --body "Implements PDF upload and RAG-based chat using aimakerspace library"
   
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
│   └── requirements.txt (updated dependencies)
├── frontend/
│   └── app/page.tsx (updated with PDF upload UI)
├── aimakerspace/ (new - copied from AIE2)
│   ├── __init__.py
│   ├── text_utils.py
│   ├── vectordatabase.py
│   └── openai_utils/
└── vercel.json (unchanged)
```

## Rollback Instructions

If issues occur after deployment:

1. **Revert to previous commit:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Or switch back to main branch:**
   ```bash
   git checkout main
   git push origin main --force
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

- The aimakerspace library is included in the repository for simplicity
- PDF processing happens server-side for security
- Vector database is stored in memory (resets on server restart)
- For production, consider using a persistent vector database like Pinecone or Weaviate
- **Frontend and Backend are now completely separate** - this is a cleaner architecture
