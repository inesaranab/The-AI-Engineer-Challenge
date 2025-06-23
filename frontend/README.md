# AI Engineer Challenge Frontend

A beautiful, modern chat interface for your LLM application built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- The FastAPI backend running on `http://localhost:8000`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 🎨 Features

- **Modern UI**: Beautiful glass-morphism design with smooth animations
- **Real-time Streaming**: Watch AI responses stream in real-time
- **Settings Panel**: Configure your OpenAI API key, system prompt, and model
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **TypeScript**: Full type safety for better development experience
- **Tailwind CSS**: Utility-first CSS framework for rapid styling

## 🔧 Configuration

Before using the chat, you need to:

1. Click the settings icon (⚙️) in the top-right corner
2. Enter your OpenAI API key
3. Optionally customize the system prompt and model
4. Start chatting!

## 🏗️ Project Structure

```
frontend/
├── app/
│   ├── globals.css          # Global styles and Tailwind imports
│   ├── layout.tsx           # Root layout component
│   └── page.tsx             # Main chat interface
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── README.md               # This file
```

## 🚀 Deployment

This frontend is ready to be deployed to Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with one click!

## 🔗 Backend Integration

This frontend integrates with the FastAPI backend located in the `/api` directory. Make sure the backend is running on `http://localhost:8000` before using the frontend.

The frontend communicates with the following backend endpoints:
- `POST /api/chat` - Send messages and receive streaming responses
- `GET /api/health` - Health check endpoint

## 🎯 Next Steps

1. Start the backend server (see `/api/README.md`)
2. Install frontend dependencies and start the dev server
3. Configure your OpenAI API key
4. Start building amazing AI applications!

## 🐛 Troubleshooting

- **CORS Errors**: Make sure the backend CORS settings allow requests from `http://localhost:3000`
- **API Key Issues**: Verify your OpenAI API key is valid and has sufficient credits
- **Build Errors**: Ensure all dependencies are installed with `npm install`