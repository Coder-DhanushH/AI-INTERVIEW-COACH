from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routes import auth_routes, password_reset_routes, user_routes, resume_routes, stats_routes

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
)

# Include routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(resume_routes.router)
app.include_router(stats_routes.router)
app.include_router(password_reset_routes.router)

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
