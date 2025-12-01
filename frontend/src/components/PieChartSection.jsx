import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

export default function PieChartSection({ title, data }) {
  if (!data || !data.dados || data.dados.length === 0) {
    return null;
  }

  // Suporta ambos os formatos: {criterio, score} ou {label, value}
  const chartData = data.dados.map((item) => ({
    name: item.criterio || item.label,
    value: item.score || item.value,
  }));

  const COLORS = ['#2563eb', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  return (
    <div style={{ marginBottom: '48px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '24px', textTransform: 'uppercase' }}>
        ▶ {title}
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
        {/* Gráfico */}
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `${value}%`}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #374151' }}>
                <th style={{ textAlign: 'left', padding: '12px 0', fontWeight: '600', color: '#374151' }}>
                  Critério
                </th>
                <th style={{ textAlign: 'right', padding: '12px 0', fontWeight: '600', color: '#374151' }}>
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {data.dados.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>
                    {item.criterio || item.label}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 0', fontWeight: '600', color: '#1f2937' }}>
                    {item.score || item.value}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
