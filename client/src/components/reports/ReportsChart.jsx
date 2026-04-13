import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../utils/api';

export default function ReportsChart({ range = '30d' }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'orders-by-day', range],
    queryFn: async () => {
      const { data } = await api.get('/reports/orders-by-day', { params: { range } });
      return data.data;
    },
  });

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Orders Over Time</h3>
      {isLoading ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">Loading…</div>
      ) : !data?.length ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">No data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="amazon"   fill="#FF9900" radius={[3,3,0,0]} />
            <Bar dataKey="flipkart" fill="#2874F0" radius={[3,3,0,0]} />
            <Bar dataKey="meesho"   fill="#F43397" radius={[3,3,0,0]} />
            <Bar dataKey="myntra"   fill="#FF3F6C" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
