# ChatFlow - Real-time Chat Application

A modern full-stack chat application built with React, Express.js, and PostgreSQL.

## Project Structure

This project has been configured for separate deployment:

- `frontend/` - React frontend (deploy to Vercel)
- `backend/` - Express.js backend (deploy to Render)
- `shared/` - Shared types and schemas

## Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## Local Development

### 1. Setup Database

Create a PostgreSQL database and get your connection string:
```
postgresql://username:password@host:port/database_name
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL and other environment variables
npm run db:push  # Push schema to your database
npm run dev      # Start backend server on port 5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your backend URL
npm run dev      # Start frontend on port 3000
```

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/chatflow
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key
```

## Production Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set build settings:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set environment variables:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-app.onrender.com`)

### Backend (Render)

1. Connect your GitHub repo to Render
2. Create a Web Service with:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Set environment variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `FRONTEND_URL`: Your Vercel frontend URL
   - `JWT_SECRET`: A secure secret key
   - Other variables as needed

### Database

Use any PostgreSQL service:
- Neon, Supabase, Railway, Render PostgreSQL, etc.
- Make sure to run `npm run db:push` from the backend directory after deployment

## Features

- Real-time messaging with WebSocket
- User authentication (email/password + social logins)
- File uploads
- Group conversations
- Typing indicators
- User presence status
- Modern UI with dark mode support

## Technologies

- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Wouter, shadcn/ui, Tailwind CSS
- **Backend**: Express.js, TypeScript, WebSocket (ws), Passport.js
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket connections
- **Authentication**: Passport.js with multiple strategies