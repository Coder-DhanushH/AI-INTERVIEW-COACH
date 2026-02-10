# AI-Powered Interview Coach - Backend

FastAPI backend for the AI Interview Coach application with JWT authentication, user management, and resume parsing.

## Features

- ✅ JWT-based authentication
- ✅ User registration and login
- ✅ User profile management
- ✅ Resume upload and PDF parsing
- ✅ PostgreSQL database
- ✅ Protected routes
- ✅ File upload validation

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **PDF Parsing**: PyPDF2
- **ORM**: SQLAlchemy

## Project Structure

```
interview-coach-backend/
├── main.py                 # FastAPI application entry point
├── database.py            # Database configuration
├── models.py              # SQLAlchemy models
├── schemas.py             # Pydantic schemas
├── auth.py                # Authentication utilities
├── pdf_parser.py          # PDF parsing utilities
├── routes/
│   ├── __init__.py
│   ├── auth_routes.py     # Authentication endpoints
│   ├── user_routes.py     # User management endpoints
│   └── resume_routes.py   # Resume upload endpoints
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Prerequisites

- Python 3.8 or higher
- PostgreSQL 12 or higher
- pip (Python package manager)

## Installation & Setup

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [PostgreSQL Official Website](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE interview_coach;
CREATE USER interview_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE interview_coach TO interview_user;
\q
```

### 3. Clone and Setup Project

```bash
# Navigate to backend directory
cd interview-coach-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your database credentials
nano .env
```

Update the `.env` file:
```env
DATABASE_URL=postgresql://interview_user:your_password@localhost:5432/interview_coach
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=uploads/resumes
MAX_FILE_SIZE=5242880
```

**Important**: Generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 5. Create Upload Directory

```bash
mkdir -p uploads/resumes
```

## Running the Application

### Development Mode

```bash
# Make sure virtual environment is activated
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs
- Alternative API Docs: http://localhost:8000/redoc

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/me` | Get current user profile | Yes |
| PUT | `/api/users/me` | Update current user profile | Yes |
| GET | `/api/users/{user_id}` | Get user by ID | No |

### Resume

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/resume/upload` | Upload resume PDF | Yes |
| GET | `/api/resume/` | Get current user's resume | Yes |
| DELETE | `/api/resume/` | Delete current user's resume | Yes |

## Testing the API

### 1. Using cURL

**Register a new user:**
```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "securepass123",
    "full_name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "securepass123"
  }'
```

**Get user profile (requires token):**
```bash
curl -X GET "http://localhost:8000/api/users/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Upload resume:**
```bash
curl -X POST "http://localhost:8000/api/resume/upload" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/your/resume.pdf"
```

### 2. Using Swagger UI

1. Open browser and go to: http://localhost:8000/docs
2. Click on "Authorize" button
3. Register a new user using `/api/auth/register`
4. Login using `/api/auth/login` and copy the `access_token`
5. Click "Authorize" again and paste: `Bearer YOUR_ACCESS_TOKEN`
6. Now you can test all protected endpoints

### 3. Using Postman

1. Import the API endpoints from Swagger
2. Create a new collection
3. Add authentication token to collection headers

### 4. Using Python Requests

```python
import requests

BASE_URL = "http://localhost:8000"

# Register
response = requests.post(f"{BASE_URL}/api/auth/register", json={
    "email": "test@example.com",
    "username": "testuser",
    "password": "securepass123",
    "full_name": "Test User"
})
print(response.json())

# Login
response = requests.post(f"{BASE_URL}/api/auth/login", json={
    "username": "testuser",
    "password": "securepass123"
})
token = response.json()["access_token"]

# Get profile
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
print(response.json())

# Upload resume
with open("resume.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post(
        f"{BASE_URL}/api/resume/upload",
        files=files,
        headers=headers
    )
print(response.json())
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    experience_years INTEGER,
    role VARCHAR(100),
    github_link VARCHAR(255),
    linkedin_link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Resumes Table
```sql
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    parsed_text TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Common Issues & Solutions

### Issue: Database connection failed
```
Solution: Check if PostgreSQL is running and credentials in .env are correct
sudo service postgresql status
```

### Issue: Module not found
```
Solution: Make sure virtual environment is activated and dependencies are installed
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Port 8000 already in use
```
Solution: Use a different port
uvicorn main:app --reload --port 8001
```

### Issue: Permission denied for uploads directory
```
Solution: Set correct permissions
chmod 755 uploads/
chmod 755 uploads/resumes/
```

## Security Notes

- Always use a strong SECRET_KEY in production
- Use HTTPS in production
- Implement rate limiting for authentication endpoints
- Regularly update dependencies
- Never commit .env file to version control
- Validate and sanitize all user inputs
- Set appropriate CORS origins for production

## Next Steps (Milestone 2)

- [ ] Implement LLM integration for question generation
- [ ] Add role-based question banks
- [ ] Create question difficulty classifier
- [ ] Build question storage system

## Support

For issues or questions, please contact the development team.

---

**Version**: 1.0.0 (Milestone 1)
**Last Updated**: February 2026
