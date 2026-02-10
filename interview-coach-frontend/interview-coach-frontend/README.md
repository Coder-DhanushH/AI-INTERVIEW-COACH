# AI Interview Coach - Frontend (Redesigned with Tailwind CSS)

Modern, clean, and professional React frontend built with Tailwind CSS.

## 🎨 New Design Features

### Based on Your Requirements:
- ✅ Clean white background with blue accents
- ✅ Professional header with logo and navigation
- ✅ Sign Up page with confirm password field
- ✅ Dashboard with comprehensive stats
- ✅ Profile dropdown menu in header
- ✅ Quick Actions section
- ✅ Modern card-based UI

### Stats Dashboard Includes:
- Practice Sessions attended
- Total Interviews Completed
- Performance Rating (out of 5)
- Improvement percentage
- Progress This Week

### Quick Actions:
1. **New Interview** - Start a practice session
2. **Complete Your Profile** - Navigate to profile update page
3. **View Analytics** - Track your progress (coming soon)

## 🚀 Installation

### Prerequisites
- Node.js 16+ installed
- Backend API running on http://localhost:8000

### Setup Steps

```bash
# Navigate to frontend directory
cd interview-coach-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at: **http://localhost:5173**

## 📦 Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router v6** - Client-side routing
- **Axios** - HTTP client

## 🎯 Pages

### 1. Welcome Page (/)
- Hero section with tagline
- Feature cards (AI Questions, Instant Feedback, Track Progress)
- How It Works section with 3 steps
- Clean header with Sign In / Sign Up buttons

### 2. Sign In Page (/login)
- Email/Username field
- Password field
- Remember me checkbox
- Forgot password link
- Link to sign up page

### 3. Sign Up Page (/register)
- First Name & Last Name fields
- Email Address
- Phone Number (optional)
- Username
- Password
- **Confirm Password** ✅ (New requirement)
- Password requirements helper text
- Link to sign in page

### 4. Dashboard (/dashboard)
Protected route - requires authentication

**Features:**
- **Header with Profile Menu**
  - User avatar with initial
  - Username and email
  - Dropdown with:
    - View Profile
    - Dashboard
    - Logout

- **Stats Section** (5 cards)
  - Practice Sessions
  - Interviews Completed
  - Performance Rating
  - Improvement
  - Progress This Week

- **Quick Actions** (3 buttons)
  - New Interview (Blue, primary action)
  - Complete Your Profile (Gray, navigates to profile)
  - View Analytics (Gray)

- **Profile View**
  - Accessible from dropdown menu
  - Update all profile fields
  - Upload resume (PDF only, max 5MB)
  - Back to dashboard button

## 🎨 Color Scheme

```css
Primary Blue: #2563EB
Primary Dark: #1E40AF
Background: #F9FAFB (gray-50)
White Cards: #FFFFFF
Text: #111827 (gray-900)
Secondary Text: #6B7280 (gray-600)
```

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## 🔐 Protected Routes

The dashboard is protected and requires authentication. Users are automatically redirected to the login page if not authenticated.

## 🛠️ API Integration

All API calls are handled through `src/services/api.js`:

```javascript
// Authentication
authAPI.register(userData)
authAPI.login({ username, password })

// User Profile
userAPI.getProfile()
userAPI.updateProfile(data)

// Resume
resumeAPI.upload(file)
resumeAPI.get()
resumeAPI.delete()
```

## 📂 Project Structure

```
src/
├── components/
│   └── ProtectedRoute.jsx    # Route protection
├── context/
│   └── AuthContext.jsx        # Auth state management
├── pages/
│   ├── Welcome.jsx            # Landing page
│   ├── Login.jsx              # Sign in page
│   ├── Register.jsx           # Sign up page
│   └── Dashboard.jsx          # Main dashboard
├── services/
│   └── api.js                 # API service layer
├── App.jsx                    # Main app component
├── main.jsx                   # Entry point
└── index.css                  # Global styles + Tailwind
```

## 🧪 Testing the Application

### Test Flow:

1. **Open Application**
   ```
   http://localhost:5173
   ```

2. **Sign Up**
   - Click "Sign Up" or "Get Started Free"
   - Fill in all fields including confirm password
   - Submit form
   - Should redirect to login

3. **Sign In**
   - Enter username and password
   - Click "Sign In"
   - Should redirect to dashboard

4. **Dashboard**
   - View welcome message with your name
   - See all 5 stat cards
   - Try Quick Actions buttons
   - Click profile dropdown
   - Navigate to "View Profile"

5. **Complete Profile**
   - Fill in all profile fields
   - Upload a PDF resume
   - Click "Update Profile"
   - Should see success message

6. **Logout**
   - Click profile dropdown
   - Click "Logout"
   - Should redirect to welcome page

## 🎨 Tailwind CSS Classes Used

### Common Utilities:
```css
/* Spacing */
p-4, p-6, p-8, px-4, py-3, space-x-4

/* Colors */
bg-primary, bg-white, text-gray-900, text-gray-600

/* Layout */
flex, grid, grid-cols-3, items-center, justify-between

/* Borders & Shadows */
rounded-lg, rounded-xl, shadow-sm, shadow-lg, border

/* Typography */
text-xl, text-2xl, text-3xl, font-bold, font-semibold

/* Interactivity */
hover:bg-primary-dark, transition-colors, focus:ring-2
```

## 🔄 State Management

Uses React Context API for authentication:
- `AuthContext` provides user state globally
- `useAuth()` hook to access auth functions
- Automatic token management with localStorage

## 🚧 Future Enhancements

- [ ] Interview simulation interface
- [ ] Real-time stats from backend
- [ ] Analytics dashboard with charts
- [ ] Performance tracking graphs
- [ ] More interview practice modes

## 📝 Notes

### Key Changes from Previous Version:
1. ✅ Added confirm password to registration
2. ✅ Redesigned dashboard with stats
3. ✅ Added profile dropdown menu
4. ✅ Implemented Quick Actions section
5. ✅ Clean, modern design matching provided screenshots
6. ✅ Using Tailwind CSS for all styling
7. ✅ Removed gradient backgrounds for cleaner look
8. ✅ Professional blue and white color scheme

### Stats Data:
Currently using mock data. In future milestones, these will be populated from:
- Backend API endpoints
- Interview session records
- Performance analytics

## 🐛 Common Issues

### Issue: Tailwind styles not working
```bash
# Make sure PostCSS and Tailwind are installed
npm install -D tailwindcss postcss autoprefixer

# Check tailwind.config.js content paths are correct
```

### Issue: API connection refused
```bash
# Make sure backend is running
cd ../interview-coach-backend
uvicorn main:app --reload
```

## 📚 Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com)
- [Vite Documentation](https://vitejs.dev)

---

**Version**: 2.0.0 (Redesigned)  
**Last Updated**: February 2026  
**Tech Stack**: React + Vite + Tailwind CSS
