import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const TrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Trends</h3>
        <div className="text-center py-12 text-gray-500">
          <p>Complete more interviews to see your progress over time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Trends</h3>
      <p className="text-sm text-gray-600 mb-4">Your interview scores over time</p>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fill: '#6B7280', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#00A896" 
            strokeWidth={3}
            dot={{ fill: '#00A896', r: 5 }}
            activeDot={{ r: 8 }} 
            name="Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;