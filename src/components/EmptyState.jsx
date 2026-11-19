import React from 'react'

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      textAlign: 'center', 
      padding: '40px 20px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      border: '1px dashed #d1d5db',
      margin: '20px 0'
    }}>
      {icon && <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'grayscale(20%)' }}>{icon}</div>}
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#374151' }}>{title}</h3>
      <p className="hint" style={{ margin: '0 0 20px 0', maxWidth: '300px', lineHeight: '1.4' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" className="btn primary" onClick={onAction} style={{ padding: '10px 20px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}