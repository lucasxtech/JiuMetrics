// Gráfico Radar para atributos de atleta
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function StatsRadarChart({ data, color = '#4f46e5' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#475467' }} tickLine={false} />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: '#98a2b3' }}
          tickLine={false}
          stroke="#e5e7eb"
        />
        <Radar
          name="Atributos"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={color}
          fillOpacity={0.25}
        />
        <Tooltip
          cursor={{ stroke: '#c7d7fe' }}
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '8px 12px',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
