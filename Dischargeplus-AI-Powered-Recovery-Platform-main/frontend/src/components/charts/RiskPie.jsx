import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export default function RiskPie({ data }) {
  const defaultData = data || [
    { name: 'Low', value: 60, color: '#2ED573' },
    { name: 'Medium', value: 25, color: '#FFA502' },
    { name: 'High', value: 15, color: '#FF4757' },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={defaultData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
            {defaultData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
        {defaultData.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} /> {d.name} ({d.value})
          </div>
        ))}
      </div>
    </div>
  )
}
