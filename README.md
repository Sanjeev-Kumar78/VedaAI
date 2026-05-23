# VedaAI

VedaAI is an intelligent, high-performance assessment creator designed for educators. It automatically generates dynamic, curriculum-aligned question papers and quizzes using Google Gemini AI. 

## Architecture
- **Frontend**: Next.js (React), TailwindCSS, GSAP Animations, Socket.io Client
- **Backend**: Express (Node.js), Socket.io, BullMQ
- **Databases**: MongoDB (Storage), Redis (Queue & Caching)
- **AI Integration**: Google Gemini (`gemini-flash-lite-latest`)

## Features
- **Asynchronous Generation**: Heavy AI tasks are processed in a background BullMQ worker to prevent request blocking.
- **Real-Time Updates**: WebSockets push generation status directly to the dashboard.
- **PDF Export**: Generates perfectly formatted, print-ready PDFs with dynamically aligned sections and automatically calculated maximum marks.
- **Customizable Fallbacks**: Robust placeholder generation ensures you always receive an assignment framework even if the AI is rate-limited.

## Local Setup
1. Clone the repository.
2. Add your `GEMINI_API_KEY` to `backend/.env`.
3. Run `docker compose up -d`.
4. Access the frontend at `http://localhost:80`.
