-- ================================================================
-- AI-Powered Interview Coach Database Schema
-- Database: PostgreSQL
-- Version: 1.0
-- Milestone: 1 - User Authentication & Profile Management
-- ================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS resumes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ================================================================
-- USERS TABLE
-- Stores user account information and profile details
-- ================================================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    experience_years INTEGER CHECK (experience_years >= 0 AND experience_years <= 50),
    role VARCHAR(100),
    github_link VARCHAR(255),
    linkedin_link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ================================================================
-- RESUMES TABLE
-- Stores uploaded resume files and parsed text
-- ================================================================

CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    parsed_text TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_uploaded_at ON resumes(uploaded_at);

-- ================================================================
-- Password Reset Tokens Table
-- Stores tokens for password reset functionality
-- ================================================================


CREATE TABLE password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user ON password_reset_tokens(user_id);

-- Categories Table
CREATE TABLE question_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Predefined categories
INSERT INTO question_categories (name, description) VALUES
('Software Development', 'Technical questions for SDE roles'),
('Data Science', 'Questions for data science and ML roles'),
('Product Management', 'Product strategy and management'),
('Marketing', 'Marketing strategy and campaigns'),
('Finance', 'Financial analysis and management'),
('Business Analyst', 'Business analysis and requirements'),
('DevOps', 'DevOps and infrastructure questions'),
('UI/UX Design', 'Design thinking and user experience');

-- Questions Table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES question_categories(id),
    question_text TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    question_type VARCHAR(50), -- 'behavioral', 'technical', 'situational'
    is_ai_generated BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Store additional info like expected keywords, time limit
    created_at TIMESTAMP DEFAULT NOW()
);

-- Interview Sessions Table
CREATE TABLE interview_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES question_categories(id),
    difficulty VARCHAR(20),
    total_questions INTEGER,
    completed_questions INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Session Questions (many-to-many)
CREATE TABLE session_questions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id),
    question_order INTEGER,
    answer_text TEXT,
    time_taken INTEGER, -- seconds
    answered_at TIMESTAMP,
    score INTEGER, -- 0-100, filled later by evaluation
    feedback TEXT -- filled later by evaluation
);

-- Indexes
CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_sessions_status ON interview_sessions(status);
-- Session questions table indexes
CREATE INDEX idx_session_questions_session ON session_questions(session_id);
CREATE INDEX idx_session_questions_question ON session_questions(question_id);

-- ================================================================
-- TRIGGER: Update updated_at timestamp automatically
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- SAMPLE DATA (Optional - for testing purposes)
-- ================================================================

-- Insert sample user (password is 'password123' - hashed with bcrypt)
-- Note: In production, use proper hashed passwords
INSERT INTO users (email, username, hashed_password, full_name, phone, experience_years, role, github_link, linkedin_link) VALUES
    ('demo@example.com', 'demouser', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MlrKYa', 'Demo User', '+1 234 567 8900', 3, 'Software Developer', 'https://github.com/demouser', 'https://linkedin.com/in/demouser');

-- ================================================================
-- VIEWS (Optional - for easy data access)
-- ================================================================

-- View to get user profile with resume information
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.phone,
    u.experience_years,
    u.role,
    u.github_link,
    u.linkedin_link,
    u.created_at,
    u.updated_at,
    r.id as resume_id,
    r.filename as resume_filename,
    r.uploaded_at as resume_uploaded_at
FROM users u
LEFT JOIN resumes r ON u.id = r.user_id;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

-- Grant all privileges on tables to interview_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO interview_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO interview_user;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check if tables are created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check table structure
-- \d users
-- \d resumes

-- View all users
-- SELECT * FROM users;

-- View all resumes
-- SELECT * FROM resumes;

-- View user profiles with resume info
-- SELECT * FROM user_profiles;

-- ================================================================
-- DATABASE STATISTICS
-- ================================================================

-- Function to get database statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    total_users BIGINT,
    total_resumes BIGINT,
    users_with_resumes BIGINT,
    users_without_resumes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM resumes) as total_resumes,
        (SELECT COUNT(*) FROM users u INNER JOIN resumes r ON u.id = r.user_id) as users_with_resumes,
        (SELECT COUNT(*) FROM users u LEFT JOIN resumes r ON u.id = r.user_id WHERE r.id IS NULL) as users_without_resumes;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM get_database_stats();

-- ================================================================
-- CLEANUP FUNCTIONS (For maintenance)
-- ================================================================

-- Function to delete old unverified users (optional for future use)
CREATE OR REPLACE FUNCTION cleanup_old_users(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM users 
    WHERE created_at < (CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL)
    AND id NOT IN (SELECT user_id FROM resumes);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT cleanup_old_users(90); -- Delete users older than 90 days without resumes

-- ================================================================
-- END OF SCHEMA
-- ================================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Tables: users, resumes';
    RAISE NOTICE 'Views: user_profiles';
    RAISE NOTICE 'Sample user created: demo@example.com';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE '========================================';
END $$;
