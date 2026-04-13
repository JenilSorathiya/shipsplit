import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  amazon:   '#FF9900',
  flipkart: '#2874F0',
  meesho:   '#F43397',
  myntra:   '#FF3F6C',
};

export default function PlatformBreakdown({ data = [] }) {
  const chartData = data.map((d) => ({ ...d, fill: COLORS[d.platform] || '#6366f1' }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Orders by Platform</h3>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="platform">
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} />
            <Legend formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
