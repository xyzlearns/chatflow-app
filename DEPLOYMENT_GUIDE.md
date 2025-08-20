# ChatFlow Deployment Guide

## 📁 Project Structure (Now Separated)

```
├── frontend/          # React app → Deploy to Vercel
├── backend/           # Express API → Deploy to Render  
├── shared/            # Shared types (copied to both dirs)
└── README.md         # Setup instructions
```

## 🚀 Quick Deployment Steps

### 1. Database Setup (First!)

Choose any PostgreSQL provider:
- **Neon**: https://neon.tech (recommended)
- **Supabase**: https://supabase.com  
- **Railway**: https://railway.app
- **Render PostgreSQL**: https://render.com

Create a database and get your connection string:
```
postgresql://username:password@host:port/database_name
```

### 2. Backend Deployment (Render)

1. **Create Render Account**: https://render.com
2. **Connect GitHub**: Link your repository
3. **Create Web Service**:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`  
   - **Start Command**: `npm start`
4. **Environment Variables**:
   ```
   DATABASE_URL=your_postgresql_connection_string
   FRONTEND_URL=https://your-app.vercel.app
   JWT_SECRET=your-secure-random-string
   NODE_ENV=production
   ```

5. **Deploy**: Render will automatically build and deploy

### 3. Database Migration

After backend deployment:
```bash
# Clone your repo locally
git clone your-repo
cd backend
npm install

# Set your DATABASE_URL in .env
echo "DATABASE_URL=your_postgresql_connection_string" >> .env

# Push database schema
npm run db:push
```

### 4. Frontend Deployment (Vercel)

1. **Create Vercel Account**: https://vercel.com
2. **Import Project**: Connect your GitHub repo
3. **Configure**:
   - **Root Directory**: `frontend`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   ```
5. **Deploy**: Vercel will build and deploy automatically

## 🔧 Local Development Setup

### Backend (Port 5000)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run db:push      # Setup database
npm run dev         # Start backend
```

### Frontend (Port 3000)  
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with backend URL
npm run dev         # Start frontend
```

## 📝 Environment Variables Reference

### Backend (.env)
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:5000
```

## 🔒 Production Security Checklist

- [ ] Set strong `JWT_SECRET` (use: `openssl rand -base64 32`)
- [ ] Use HTTPS URLs in production
- [ ] Set correct CORS origins in `FRONTEND_URL`
- [ ] Use environment variables, not hardcoded secrets
- [ ] Enable SSL for database connections

## 🐛 Common Issues & Solutions

**Database Connection Error**
- ✅ Verify DATABASE_URL format
- ✅ Check database server is accessible
- ✅ Run `npm run db:push` to create tables

**CORS Errors**  
- ✅ Set correct `FRONTEND_URL` in backend env
- ✅ Verify frontend `VITE_API_URL` points to backend

**Build Failures**
- ✅ Check all dependencies in package.json
- ✅ Verify TypeScript compiles locally first

## 📱 Features Included

- ✅ Real-time messaging (WebSocket)
- ✅ User authentication (email/password + OAuth)
- ✅ File uploads  
- ✅ Group conversations
- ✅ Typing indicators
- ✅ Dark mode
- ✅ Mobile responsive

## 🎯 Next Steps

1. **Deploy Backend First** (needs database)
2. **Configure Database** (run migrations)  
3. **Deploy Frontend** (point to backend URL)
4. **Test End-to-End** (create account, send messages)

Your app will be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

## 💡 Pro Tips

- Use Render's free tier for backend (with limitations)
- Vercel free tier is generous for frontend
- Monitor database usage on your chosen provider
- Set up branch previews on Vercel for testing