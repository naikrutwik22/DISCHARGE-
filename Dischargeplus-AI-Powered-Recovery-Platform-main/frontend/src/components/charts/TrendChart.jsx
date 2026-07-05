import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts'

export default function TrendChart({ data, dataKey, title, color = '#00D4AA', normalRange, unit = '' }) {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>{title}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} tickFormatter={(v) => v?.slice(5) || v} />
          <YAxis stroke="var(--text-secondary)" fontSize={10} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }}
            formatter={(v) => [`${v}${unit}`, title]}
          />
          {normalRange && (
            <ReferenceArea
              y1={normalRange[0]}
              y2={normalRange[1]}
              fill="#00D4AA"
              fillOpacity={0.08}
              stroke="none"
            />
          )}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      {normalRange && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Normal range: {normalRange[0]}{unit} – {normalRange[1]}{unit}
        </p>
      )}
    </div>
  )
}
