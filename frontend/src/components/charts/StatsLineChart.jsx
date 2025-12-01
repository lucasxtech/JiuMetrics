// Gráfico de linha para evolução
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StatsLineChart({ data, lineKey = 'value', color = '#4f46e5' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#edf2ff" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475467' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#97a0b5' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '8px 12px',
          }}
        />
        <Line
          type="monotone"
          dataKey={lineKey}
          stroke={color}
          strokeWidth={3}
          dot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: color }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
