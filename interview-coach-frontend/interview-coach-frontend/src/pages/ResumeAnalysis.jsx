import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI, resumeAnalysisAPI} from '../services/api';
const ResumeAnalysis = () => {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    checkResume();
    fetchAnalysis();
  }, []);

    const checkResume = async () => {
        try {
        const response = await resumeAPI.get();
        if (response.data && response.data.parsed_text) {
            setHasResume(true);
            console.log('✅ Resume available');
        } else {
            setHasResume(false);
        }
        } catch (error) {
        console.log('No resume found');
        setHasResume(false);
        }
    };

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const response = await resumeAnalysisAPI.getAnalysis();
      setAnalysis(response.data);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching analysis:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError('');
      
      const response = await resumeAnalysisAPI.analyzeResume();
      
      // Fetch the full analysis
      await fetchAnalysis();
      
      alert(`✅ Analysis complete! Overall score: ${response.data.overall_score}/100`);
      
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.response?.data?.detail || 'Failed to analyze resume');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Resume Found</h2>
            <p className="text-gray-600 mb-6">Upload your resume first to get AI-powered analysis</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Upload Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary hover:text-primary-dark mb-4 flex items-center"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Resume Analysis
              </h1>
              <p className="text-gray-600">
                AI-powered comprehensive analysis of your resume
              </p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>{analysis ? 'Re-analyze Resume' : 'Analyze Resume'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!analysis ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Analyze Your Resume
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Click the "Analyze Resume" button above to get a comprehensive AI-powered analysis of your resume with actionable feedback on strengths, weaknesses, and improvement areas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-900 mb-1">Detailed Scores</h3>
                <p className="text-sm text-gray-600">Get scores across 7 key categories</p>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="text-3xl mb-2">💡</div>
                <h3 className="font-semibold text-gray-900 mb-1">Actionable Tips</h3>
                <p className="text-sm text-gray-600">Specific improvements with examples</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="text-3xl mb-2">✓</div>
                <h3 className="font-semibold text-gray-900 mb-1">ATS Check</h3>
                <p className="text-sm text-gray-600">Ensure your resume passes ATS systems</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Overall Score Card */}
            <div className="bg-gradient-to-r from-primary to-blue-600 rounded-xl p-8 shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Overall Resume Score</h2>
                  <p className="text-blue-100">
                    Based on comprehensive analysis across 7 categories
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-6xl font-bold">{analysis.overall_score}</div>
                  <div className="text-xl">/100</div>
                </div>
              </div>
              <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="opacity-75">Analyzed</div>
                    <div className="font-semibold">{new Date(analysis.analyzed_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="opacity-75">Strengths</div>
                    <div className="font-semibold">{analysis.strengths.length} found</div>
                  </div>
                  <div>
                    <div className="opacity-75">Improvements</div>
                    <div className="font-semibold">{analysis.improvements.length} suggested</div>
                  </div>
                  <div>
                    <div className="opacity-75">Action Items</div>
                    <div className="font-semibold">{analysis.action_items.length} tasks</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Category Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(analysis.category_scores).map(([category, score]) => (
                  <div key={category} className="text-center">
                    <div className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {category.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Strengths ({analysis.strengths.length})
              </h2>
              <div className="space-y-4">
                {analysis.strengths.map((strength, index) => (
                  <div key={index} className="border-l-4 border-green-500 bg-green-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{strength.title}</h3>
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                        {strength.category}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm mb-2">{strength.description}</p>
                    {strength.impact && (
                      <p className="text-green-700 text-sm flex items-start">
                        <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span><strong>Impact:</strong> {strength.impact}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Areas to Improve ({analysis.weaknesses.length})
              </h2>
              <div className="space-y-4">
                {analysis.weaknesses.map((weakness, index) => (
                  <div key={index} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{weakness.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${getSeverityColor(weakness.severity)}`}>
                          {weakness.severity}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                          {weakness.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">{weakness.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Actionable Improvements ({analysis.improvements.length})
              </h2>
              <div className="space-y-6">
                {analysis.improvements.map((improvement, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{improvement.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(improvement.priority)}`}>
                        {improvement.priority} Priority
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-red-600">Current Issue:</span>
                        <p className="text-gray-700 text-sm mt-1">{improvement.current_issue}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-semibold text-green-600">Suggested Fix:</span>
                        <p className="text-gray-700 text-sm mt-1">{improvement.suggested_fix}</p>
                      </div>
                      
                      {improvement.example_before && improvement.example_after && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div className="bg-red-50 p-3 rounded border border-red-200">
                            <div className="text-xs font-semibold text-red-700 mb-1">❌ Before:</div>
                            <div className="text-sm text-gray-700 italic">{improvement.example_before}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <div className="text-xs font-semibold text-green-700 mb-1">✅ After:</div>
                            <div className="text-sm text-gray-700 italic">{improvement.example_after}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ATS Compatibility */}
            {analysis.ats_compatibility && (
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  ATS Compatibility - Score: {analysis.ats_compatibility.score}/100
                </h2>
                
                <div className={`p-4 rounded-lg mb-4 ${analysis.ats_compatibility.is_ats_friendly ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <div className="flex items-center">
                    {analysis.ats_compatibility.is_ats_friendly ? (
                      <>
                        <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-800 font-semibold">Your resume is ATS-friendly!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-yellow-800 font-semibold">Some ATS compatibility issues found</span>
                      </>
                    )}
                  </div>
                </div>

                {analysis.ats_compatibility.issues && analysis.ats_compatibility.issues.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900 mb-2">Issues to Fix:</h3>
                    {analysis.ats_compatibility.issues.map((item, index) => (
                      <div key={index} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div className="font-semibold text-sm text-gray-900 mb-1">⚠️ {item.issue}</div>
                        <div className="text-sm text-gray-700">💡 Fix: {item.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Items */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Priority Action Items
              </h2>
              <div className="space-y-3">
                {analysis.action_items.sort((a, b) => b.priority - a.priority).map((item, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {item.priority}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{item.action}</div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                        <span>⏱️ {item.estimated_time}</span>
                        <span className={`px-2 py-0.5 rounded ${item.impact === 'High' ? 'bg-red-100 text-red-700' : item.impact === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {item.impact} Impact
                        </span>
                        <span className="text-gray-500">{item.category}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalysis;