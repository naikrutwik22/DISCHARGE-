export default function RiskBadge({ level, size = 'md' }) {
  const colors = {
    high: { bg: 'rgba(255,71,87,0.15)', color: '#FF4757', label: 'High Risk' },
    medium: { bg: 'rgba(255,165,2,0.15)', color: '#FFA502', label: 'Medium' },
    low: { bg: 'rgba(46,213,115,0.15)', color: '#2ED573', label: 'Low Risk' },
  }

  const c = colors[level] || colors.low
  const sizes = {
    sm: { padding: '3px 8px', fontSize: 10 },
    md: { padding: '5px 12px', fontSize: 12 },
    lg: { padding: '7px 16px', fontSize: 14 },
  }
  const s = sizes[size] || sizes.md

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: s.padding,
      borderRadius: 20,
      fontSize: s.fontSize,
      fontWeight: 600,
      background: c.bg,
      color: c.color,
      letterSpacing: '0.3px',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: c.color,
        boxShadow: `0 0 6px ${c.color}`,
      }} />
      {c.label}
    </span>
  )
}
