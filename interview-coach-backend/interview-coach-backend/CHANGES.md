# Backend Changes for Frontend Support

## New Features Added

### 1. ✅ Dashboard Statistics Endpoint

**File:** `routes/stats_routes.py` (NEW)

**Endpoint:** `GET /api/stats/dashboard`

**Returns:**
```json
{
  "practice_sessions": 12,
  "interviews_completed": 8,
  "performance_rating": 4.5,
  "improvement": 15,
  "progress_this_week": 3,
  "total_questions_answered": 45,
  "average_score": 85,
  "strongest_area": "Technical Skills",
  "improvement_area": "Communication"
}
```

**Purpose:**
- Provides all statistics needed for the dashboard
- Currently returns mock data
- Will be replaced with real queries in Milestone 2-3 when interview tables are created

---

### 2. ✅ Performance History Endpoint

**Endpoint:** `GET /api/stats/performance-history`

**Returns:**
```json
{
  "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
  "scores": [70, 75, 82, 85],
  "sessions": [2, 3, 4, 3]
}
```

**Purpose:**
- Data for charts/graphs in analytics view
- Ready for future use in Milestone 4

---

### 3. ✅ Category Breakdown Endpoint

**Endpoint:** `GET /api/stats/category-breakdown`

**Returns:**
```json
{
  "technical_skills": 85,
  "communication": 75,
  "problem_solving": 90,
  "leadership": 70,
  "behavioral": 80
}
```

**Purpose:**
- Performance breakdown by category
- For radar charts and detailed analytics

---

## Files Modified

### 1. `main.py`
**What changed:**
- Added import for `stats_routes`
- Included stats router in the app

**Code:**
```python
from routes import auth_routes, user_routes, resume_routes, stats_routes

# Include routers
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(resume_routes.router)
app.include_router(stats_routes.router)  # NEW
```

---

## Why Mock Data?

The stats endpoints currently return **mock (fake) data** because:

1. **Milestone 1** only includes user authentication and profile management
2. Interview-related tables (sessions, responses, ratings) will be created in **Milestone 2-3**
3. Mock data allows the frontend to work immediately and look complete

---

## When Will Real Data Be Used?

### Milestone 2-3: Interview System

You'll create these tables:
```sql
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(100),
    difficulty VARCHAR(50),
    status VARCHAR(50),  -- 'in_progress', 'completed'
    created_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE interview_responses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES interview_sessions(id),
    question_id INTEGER,
    answer TEXT,
    score INTEGER,  -- 0-100
    created_at TIMESTAMP
);

CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id INTEGER REFERENCES interview_sessions(id),
    technical_skills INTEGER,
    communication INTEGER,
    problem_solving INTEGER,
    overall_score INTEGER,
    created_at TIMESTAMP
);
```

Then update `stats_routes.py` to query real data:

```python
@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Real queries
    practice_sessions = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id
    ).count()
    
    interviews_completed = db.query(InterviewSession).filter(
        InterviewSession.user_id == current_user.id,
        InterviewSession.status == "completed"
    ).count()
    
    # Calculate average score
    avg_score = db.query(func.avg(InterviewResponse.score)).filter(
        InterviewResponse.user_id == current_user.id
    ).scalar()
    
    # ... more real calculations
    
    return {
        "practice_sessions": practice_sessions,
        "interviews_completed": interviews_completed,
        "performance_rating": avg_score / 20,  # Convert to 0-5 scale
        # ... etc
    }
```

---

## Frontend Changes

The frontend has also been updated to fetch stats from the backend:

### 1. `src/services/api.js`
**Added:**
```javascript
export const statsAPI = {
  getDashboard: () => api.get('/api/stats/dashboard'),
  getPerformanceHistory: () => api.get('/api/stats/performance-history'),
  getCategoryBreakdown: () => api.get('/api/stats/category-breakdown'),
};
```

### 2. `src/pages/Dashboard.jsx`
**Changed:**
- Removed hardcoded mock data
- Added `fetchDashboardStats()` function
- Fetches stats from API on component mount
- Falls back to zeros if API fails

**Code:**
```javascript
const fetchDashboardStats = async () => {
  try {
    const response = await statsAPI.getDashboard();
    setStats({
      practiceSessions: response.data.practice_sessions,
      interviewsCompleted: response.data.interviews_completed,
      // ... etc
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};
```

---

## Testing the New Endpoints

### Using cURL
```bash
# Get dashboard stats (requires authentication)
curl -X GET "http://localhost:8000/api/stats/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Using Swagger UI
1. Go to http://localhost:8000/docs
2. Authorize with your JWT token
3. Try the `/api/stats/dashboard` endpoint
4. See the mock data returned

### Using Frontend
1. Login to the application
2. Navigate to dashboard
3. Stats will load automatically from the backend
4. Check browser console for API calls

---

## API Documentation

All new endpoints are automatically documented in:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc


