import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from fastapi.staticfiles import StaticFiles
from routes import auth_routes, password_reset_routes, user_routes, resume_routes, stats_routes, question_routes, session_routes, evaluation_routes, analytics_routes, audio_routes, session_video_routes, resume_analysis_routes

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-Powered Interview Coach API",
    description="Backend API for AI Interview Coach Application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # ⭐ Important for file uploads
    max_age=3600,
)

uploads_dir = os.path.join(os.getcwd(), "uploads")
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
    
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(resume_routes.router)
app.include_router(stats_routes.router)
app.include_router(password_reset_routes.router)
app.include_router(question_routes.router)
app.include_router(session_routes.router)
app.include_router(evaluation_routes.router)
app.include_router(analytics_routes.router)
app.include_router(audio_routes.router)
app.include_router(session_video_routes.router)
app.include_router(resume_analysis_routes.router)

@app.get("/")
async def root():
    return {
        "message": "AI-Powered Interview Coach API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
