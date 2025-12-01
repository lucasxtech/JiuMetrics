// Gráfico de Barras para ataques mais usados
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StatsBarChart({ data, xDataKey = 'name', color = '#4f46e5' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barCategoryGap={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#edf2ff" vertical={false} />
        <XAxis dataKey={xDataKey} tick={{ fontSize: 12, fill: '#475467' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#97a0b5' }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(79,70,229,0.08)' }}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '8px 12px',
          }}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
