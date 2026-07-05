import { motion } from 'framer-motion'

export default function StatCard({ title, value, icon: Icon, trend, color = 'var(--accent)', onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card glass-card-hover"
      style={{ padding: 24, position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Glow background */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: color, opacity: 0.08, filter: 'blur(20px)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
            {value}
          </p>
          {trend !== undefined && (
            <p style={{
              fontSize: 12, marginTop: 8, fontWeight: 500,
              color: trend >= 0 ? 'var(--risk-low)' : 'var(--risk-high)',
            }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: `${color}15`, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={22} color={color} />
          </div>
        )}
      </div>
    </motion.div>
  )
}
