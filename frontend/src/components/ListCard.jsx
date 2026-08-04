/**
 * Tarjeta de listado para móvil y tablet
 */
export default function ListCard({
  title,
  subtitle,
  badge,
  fields = [],
  actions,
  highlight,
  featured,
  className = '',
}) {
  return (
    <article className={`list-card ${highlight ? 'list-card-highlight' : ''} ${className}`.trim()}>
      <div className="list-card-header">
        <div className="list-card-title-wrap">
          <h4 className="list-card-title">{title}</h4>
          {subtitle && <p className="list-card-subtitle">{subtitle}</p>}
        </div>
        {badge && <div className="list-card-badge">{badge}</div>}
      </div>

      {featured && (
        <div className="list-card-featured">
          <span className="list-card-featured-label">{featured.label}</span>
          <span className="list-card-featured-value">{featured.value}</span>
        </div>
      )}

      {fields.length > 0 && (
        <div className="list-card-fields">
          {fields.map((field, i) => (
            <div key={i} className="list-card-field">
              <span className="list-card-field-label">{field.label}</span>
              <span className={`list-card-field-value ${field.highlight ? 'highlight' : ''}`}>
                {field.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {actions && <div className="list-card-actions">{actions}</div>}
    </article>
  );
}
