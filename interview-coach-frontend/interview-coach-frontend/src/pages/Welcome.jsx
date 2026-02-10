import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AI</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Interview Coach</span>
            </div>

            {/* Nav Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Ace Your Next <span className="text-primary">Interview</span>
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Practice with AI-powered mock interviews, get personalized feedback, and build confidence for your dream job
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center space-x-4 mb-20">
          <button
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-lg transition-colors"
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg text-lg transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Questions</h3>
            <p className="text-gray-600">
              Get role-specific interview questions tailored to your experience level and target position
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Instant Feedback</h3>
            <p className="text-gray-600">
              Receive detailed analysis of your answers with scoring on clarity, content, and confidence
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Track Progress</h3>
            <p className="text-gray-600">
              Monitor your improvement over time with detailed analytics and performance metrics
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="text-left max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">How It Works</h2>
          
          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Your Profile</h3>
                <p className="text-gray-600 text-lg">
                  Tell us about your target role, experience level, and career goals
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Practice Interviews</h3>
                <p className="text-gray-600 text-lg">
                  Answer AI-generated questions specific to your role and industry
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Feedback & Improve</h3>
                <p className="text-gray-600 text-lg">
                  Receive detailed analysis and actionable suggestions to improve your performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
