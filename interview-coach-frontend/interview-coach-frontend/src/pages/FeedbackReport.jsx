import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationAPI } from '../services/api';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';

const FeedbackReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await evaluationAPI.getResults(id);
      setResults(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch results:', err);
      setError('Failed to load evaluation results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback report...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No results found'}</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-primary text-white rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const firstEvaluated = results.results.find(r => r.evaluation_metadata?.scores);
  const radarData = firstEvaluated?.evaluation_metadata?.scores ? [
    { criteria: 'Content', score: firstEvaluated.evaluation_metadata.scores.content, fullMark: 100 },
    { criteria: 'Clarity', score: firstEvaluated.evaluation_metadata.scores.clarity, fullMark: 100 },
    { criteria: 'Technical', score: firstEvaluated.evaluation_metadata.scores.technical_accuracy, fullMark: 100 },
    { criteria: 'Complete', score: firstEvaluated.evaluation_metadata.scores.completeness, fullMark: 100 }
  ] : [];

  const evaluatedQuestions = results.results.filter(r => r.score !== null);
  const avgScore = results.average_score;
  const sessionVideo = results.video_metrics || null;

  const scoreColor = (score) => {
    if (score >= 80) return 'text-green-700';
    if (score >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  const scoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-primary hover:text-primary-dark mb-4 flex items-center">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Detailed Feedback Report</h1>
          <p className="text-gray-600 mt-2">AI-powered analysis of your interview performance</p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-xl shadow-lg mb-8 text-white">
          <div className="text-center">
            <div className="text-7xl font-bold mb-2">{Math.round(avgScore)}</div>
            <div className="text-xl opacity-90 mb-4">Overall Score</div>
            <div className="flex justify-center gap-8 text-sm opacity-80">
              <div>
                <div className="text-2xl font-bold">{evaluatedQuestions.length}</div>
                <div>Evaluated</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{results.total_questions}</div>
                <div>Total Questions</div>
              </div>
            </div>
            <div className="mt-6 text-lg">
              {avgScore >= 80 && "🌟 Outstanding Performance!"}
              {avgScore >= 70 && avgScore < 80 && "🎯 Great Job!"}
              {avgScore >= 60 && avgScore < 70 && "👍 Good Work!"}
              {avgScore < 60 && "💪 Keep Practicing!"}
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        {radarData.length > 0 && (
          <div className="bg-white p-8 rounded-xl shadow-sm border mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Breakdown</h2>
            <p className="text-gray-600 mb-6">Your scores across different evaluation criteria</p>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis dataKey="criteria" tick={{ fill: '#6B7280', fontSize: 14 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6B7280' }} />
                <Radar name="Your Score" dataKey="score" stroke="#1E2761" fill="#00A896" fillOpacity={0.6} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-1">Content Quality</h4>
                <p className="text-sm text-gray-700">Accuracy and relevance of your answer</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-1">Clarity</h4>
                <p className="text-sm text-gray-700">How clear and well-structured your response is</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-1">Technical Accuracy</h4>
                <p className="text-sm text-gray-700">Correctness of technical details and terms</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-1">Completeness</h4>
                <p className="text-sm text-gray-700">Coverage of all important aspects</p>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Feedback */}
        <div className="bg-white p-8 rounded-xl shadow-sm border mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Question-by-Question Analysis</h2>
          
          {results.results.map((result, index) => (
            <div key={result.session_question_id} className="mb-8 pb-8 border-b last:border-b-0">
              
              {/* Question Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900">Question {index + 1}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      result.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                      result.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {result.difficulty}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {result.question_type}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{result.question_text}</p>
                </div>
                {result.score !== null && (
                  <div className={`ml-4 px-4 py-2 rounded-lg font-bold text-2xl ${
                    result.score >= 80 ? 'bg-green-100 text-green-700' :
                    result.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {result.score}
                  </div>
                )}
              </div>

              {/* Your Answer */}
              {result.answer_text && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Answer:</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{result.answer_text}</p>
                  </div>
                  {result.time_taken && (
                    <p className="text-xs text-gray-500 mt-2">
                      Time taken: {Math.floor(result.time_taken / 60)}:{(result.time_taken % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              )}

              {/* AI Feedback */}
              {result.feedback && (
                <div className="mb-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <span className="text-2xl mr-3">💡</span>
                      <div>
                        <h4 className="text-sm font-semibold text-blue-900 mb-2">AI Feedback:</h4>
                        <p className="text-gray-700">{result.feedback}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Improvements */}
              {result.evaluation_metadata?.improvements?.length > 0 && (
                <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">🎯</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-yellow-900 mb-2">How to Improve:</h4>
                      <ul className="space-y-2">
                        {result.evaluation_metadata.improvements.map((improvement, i) => (
                          <li key={i} className="flex items-start text-gray-700">
                            <span className="text-yellow-600 mr-2">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Scores */}
              {result.evaluation_metadata?.scores && (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {Object.entries(result.evaluation_metadata.scores).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-2xl font-bold text-primary">{value}</div>
                      <div className="text-xs text-gray-600 mt-1 capitalize">{key.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Speech Analysis */}
              {result.speech_metrics && Object.keys(result.speech_metrics).length > 0 && (
                <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">🎤</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3">Speech Analysis:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Speech Rate</div>
                          <div className="text-lg font-bold text-purple-700">{result.speech_metrics.speech_rate} WPM</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Fluency</div>
                          <div className="text-lg font-bold text-purple-700">{result.speech_metrics.fluency_score}/100</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Confidence</div>
                          <div className="text-lg font-bold text-purple-700">{result.speech_metrics.confidence_score}/100</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Filler Words</div>
                          <div className="text-lg font-bold text-purple-700">{result.speech_metrics.filler_words_count}</div>
                        </div>
                      </div>
                      {result.speech_metrics.speech_feedback && (
                        <p className="text-sm text-gray-700 mb-2">{result.speech_metrics.speech_feedback}</p>
                      )}
                      {result.speech_metrics.speech_improvements?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-purple-900 mb-1">Speaking Tips:</p>
                          <ul className="space-y-1">
                            {result.speech_metrics.speech_improvements.map((tip, i) => (
                              <li key={i} className="flex items-start text-sm text-gray-700">
                                <span className="text-purple-600 mr-2">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Per-question Video Analysis */}
              {result.video_analysis && Object.keys(result.video_analysis).length > 0 && (
                <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">🎥</span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-green-900 mb-3">Video Presentation Analysis:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Eye Contact</div>
                          <div className="text-lg font-bold text-green-700">{result.video_analysis.eye_contact?.score}/100</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Body Language</div>
                          <div className="text-lg font-bold text-green-700">{result.video_analysis.body_language?.score}/100</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Expressions</div>
                          <div className="text-lg font-bold text-green-700">{result.video_analysis.facial_expressions?.score}/100</div>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <div className="text-xs text-gray-600">Presentation</div>
                          <div className="text-lg font-bold text-green-700">{result.video_analysis.presentation?.score}/100</div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        {result.video_analysis.eye_contact?.feedback && (
                          <div><span className="font-semibold text-green-900">Eye Contact:</span>{' '}<span className="text-gray-700">{result.video_analysis.eye_contact.feedback}</span></div>
                        )}
                        {result.video_analysis.body_language?.feedback && (
                          <div><span className="font-semibold text-green-900">Body Language:</span>{' '}<span className="text-gray-700">{result.video_analysis.body_language.feedback}</span></div>
                        )}
                        {result.video_analysis.facial_expressions?.feedback && (
                          <div><span className="font-semibold text-green-900">Expressions:</span>{' '}<span className="text-gray-700">{result.video_analysis.facial_expressions.feedback}</span></div>
                        )}
                        {result.video_analysis.presentation?.feedback && (
                          <div><span className="font-semibold text-green-900">Setup:</span>{' '}<span className="text-gray-700">{result.video_analysis.presentation.feedback}</span></div>
                        )}
                      </div>
                      {result.video_analysis.video_improvements?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-1">Presentation Tips:</p>
                          <ul className="space-y-1">
                            {result.video_analysis.video_improvements.map((tip, i) => (
                              <li key={i} className="flex items-start text-sm text-gray-700">
                                <span className="text-green-600 mr-2">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ⭐ Session Video Analysis - shown after all questions */}
        {sessionVideo && (
          <div className="bg-white p-8 rounded-xl shadow-sm border mb-8">
            <div className="flex items-center mb-6">
              <span className="text-3xl mr-3">🎥</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Overall Video Interview Analysis</h2>
                <p className="text-gray-600 text-sm">AI analysis of your body language and presentation throughout the full session</p>
              </div>
            </div>

            {/* Overall Confidence Score */}
            {sessionVideo.overall_confidence && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900 text-lg">Overall Confidence</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {sessionVideo.overall_confidence.feedback || 'Based on your body language and presentation throughout the session'}
                    </p>
                    {sessionVideo.overall_confidence.improvement && (
                      <p className="text-sm text-green-800 mt-2 italic">{sessionVideo.overall_confidence.improvement}</p>
                    )}
                  </div>
                  <div className={`text-5xl font-bold ml-6 ${scoreColor(sessionVideo.overall_confidence.score)}`}>
                    {sessionVideo.overall_confidence.score}
                    <span className="text-lg font-normal text-gray-500">/100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Video Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {sessionVideo.eye_contact && (
                <div className={`p-4 rounded-xl ${scoreBg(sessionVideo.eye_contact.score)}`}>
                  <div className="text-2xl mb-1">👁️</div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Eye Contact</div>
                  <div className={`text-3xl font-bold mt-1 ${scoreColor(sessionVideo.eye_contact.score)}`}>
                    {sessionVideo.eye_contact.score}
                    <span className="text-sm font-normal">/100</span>
                  </div>
                  {sessionVideo.eye_contact.feedback && (
                    <p className="text-xs text-gray-600 mt-2">{sessionVideo.eye_contact.feedback}</p>
                  )}
                  {sessionVideo.eye_contact.improvement && (
                    <p className="text-xs text-gray-500 mt-1 italic">{sessionVideo.eye_contact.improvement}</p>
                  )}
                </div>
              )}

              {sessionVideo.body_language && (
                <div className={`p-4 rounded-xl ${scoreBg(sessionVideo.body_language.score)}`}>
                  <div className="text-2xl mb-1">🧍</div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Body Language</div>
                  <div className={`text-3xl font-bold mt-1 ${scoreColor(sessionVideo.body_language.score)}`}>
                    {sessionVideo.body_language.score}
                    <span className="text-sm font-normal">/100</span>
                  </div>
                  {sessionVideo.body_language.feedback && (
                    <p className="text-xs text-gray-600 mt-2">{sessionVideo.body_language.feedback}</p>
                  )}
                  {sessionVideo.body_language.improvement && (
                    <p className="text-xs text-gray-500 mt-1 italic">{sessionVideo.body_language.improvement}</p>
                  )}
                </div>
              )}

              {sessionVideo.presentation && (
                <div className={`p-4 rounded-xl ${scoreBg(sessionVideo.presentation.score)}`}>
                  <div className="text-2xl mb-1">🖥️</div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Presentation</div>
                  <div className={`text-3xl font-bold mt-1 ${scoreColor(sessionVideo.presentation.score)}`}>
                    {sessionVideo.presentation.score}
                    <span className="text-sm font-normal">/100</span>
                  </div>
                  {sessionVideo.presentation.feedback && (
                    <p className="text-xs text-gray-600 mt-2">{sessionVideo.presentation.feedback}</p>
                  )}
                  {sessionVideo.presentation.improvement && (
                    <p className="text-xs text-gray-500 mt-1 italic">{sessionVideo.presentation.improvement}</p>
                  )}
                </div>
              )}

              {sessionVideo.consistency && (
                <div className={`p-4 rounded-xl ${scoreBg(sessionVideo.consistency.score)}`}>
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-xs text-gray-600 font-medium uppercase tracking-wide">Consistency</div>
                  <div className={`text-3xl font-bold mt-1 ${scoreColor(sessionVideo.consistency.score)}`}>
                    {sessionVideo.consistency.score}
                    <span className="text-sm font-normal">/100</span>
                  </div>
                  {sessionVideo.consistency.feedback && (
                    <p className="text-xs text-gray-600 mt-2">{sessionVideo.consistency.feedback}</p>
                  )}
                  {sessionVideo.consistency.improvement && (
                    <p className="text-xs text-gray-500 mt-1 italic">{sessionVideo.consistency.improvement}</p>
                  )}
                </div>
              )}
            </div>

            {/* Video Improvements */}
            {sessionVideo.video_improvements?.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <span className="text-2xl mr-3">🎯</span>
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-2">Presentation Tips</h4>
                    <ul className="space-y-1">
                      {sessionVideo.video_improvements.map((tip, i) => (
                        <li key={i} className="flex items-start text-sm text-gray-700">
                          <span className="text-yellow-600 mr-2">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Session Stats */}
            {(sessionVideo.session_duration || sessionVideo.total_frames_analyzed) && (
              <div className="mt-4 flex gap-4 text-sm text-gray-500">
                {sessionVideo.session_duration && (
                  <span>⏱️ Session duration: {Math.floor(sessionVideo.session_duration / 60)}:{String(sessionVideo.session_duration % 60).padStart(2, '0')}</span>
                )}
                {sessionVideo.total_frames_analyzed && (
                  <span>📸 Frames analyzed: {sessionVideo.total_frames_analyzed}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/question-setup')}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold transition"
          >
            Start New Interview →
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackReport;