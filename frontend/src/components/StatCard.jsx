export default function StatCard({ icon: Icon, label, value, color = '#1A4AB0', subtext }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `${color}18`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {subtext && <div className="stat-card-label" style={{ marginTop: '0.5rem' }}>{subtext}</div>}
    </div>
  );
}
