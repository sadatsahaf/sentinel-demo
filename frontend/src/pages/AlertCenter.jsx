import { useState, useEffect } from 'react'
import { fetchAlerts, resolveAlert, explainAlert } from '../api'

const SEVERITY_COLOR = { CRITICAL: '#c0392b', WARNING: '#d4850a', INFO: '#1a9e6e' }
const SEVERITY_BG = { CRITICAL: '#fdecea', WARNING: '#fef3e2', INFO: '#e8f8f2' }
const TYPE_ICON = {
  OVERHEAT: '🌡',
  IDLE: '💤',
  HARDWARE_FAULT: '⚠',
  OVERLOAD: '⚡',
  JOB_OVERRUN: '⏱',
}

function AlertCard({ alert, onResolve, onExplain, explaining }) {
  const color = SEVERITY_COLOR[alert.severity] || '#6b7280'
  const bg = SEVERITY_BG[alert.severity] || '#f9fafb'
  const ts = new Date(alert.timestamp).toLocaleTimeString()
  const icon = TYPE_ICON[alert.type] || '●'

  return (
    <div className={`alert-card ${alert.resolved ? 'resolved' : ''}`}
      style={{ borderLeft: `4px solid ${color}`, background: alert.resolved ? '#f9fafb' : bg }}>
      <div className="alert-card-header">
        <div className="alert-card-left">
          <span className="alert-icon">{icon}</span>
          <div>
            <div className="alert-card-title">{alert.message}</div>
            <div className="alert-card-meta">
              <span className="alert-severity-pill" style={{ background: color }}>
                {alert.severity}
              </span>
              <span className="alert-node">{alert.node_name}</span>
              <span className="alert-time">{ts}</span>
            </div>
          </div>
        </div>
        <div className="alert-card-actions">
          {!alert.resolved && (
            <>
              {!alert.ai_explanation && (
                <button
                  className="btn-explain"
                  onClick={() => onExplain(alert.id)}
                  disabled={explaining === alert.id}
                >
                  {explaining === alert.id ? 'Asking AI...' : 'AI explain'}
                </button>
              )}
              <button className="btn-resolve" onClick={() => onResolve(alert.id)}>
                Resolve
              </button>
            </>
          )}
          {alert.resolved && <span className="resolved-label">Resolved</span>}
        </div>
      </div>

      {alert.detail && !alert.ai_explanation && (
        <div className="alert-detail">{alert.detail}</div>
      )}

      {alert.ai_explanation && (
        <div className="ai-explanation">
          <div className="ai-label">◈ SENTINEL AI</div>
          <div className="ai-text">{alert.ai_explanation}</div>
        </div>
      )}
    </div>
  )
}

export default function AlertCenter() {
  const [data, setData] = useState({ alerts: [], summary: {} })
  const [showResolved, setShowResolved] = useState(false)
  const [explaining, setExplaining] = useState(null)
  const [filter, setFilter] = useState('ALL')

  const load = async () => {
    try {
      const d = await fetchAlerts(showResolved)
      setData(d)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [showResolved])

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id)
      load()
    } catch (e) {
      console.error(e)
    }
  }

  const handleExplain = async (id) => {
    setExplaining(id)
    try {
      const res = await explainAlert(id)
      setData(prev => ({
        ...prev,
        alerts: prev.alerts.map(a =>
          a.id === id ? { ...a, ai_explanation: res.explanation } : a
        )
      }))
    } catch (e) {
      console.error(e)
    } finally {
      setExplaining(null)
    }
  }

  const filtered = data.alerts.filter(a => {
    if (filter === 'ALL') return true
    if (filter === 'CRITICAL') return a.severity === 'CRITICAL'
    if (filter === 'WARNING') return a.severity === 'WARNING'
    if (filter === 'UNRESOLVED') return !a.resolved
    return true
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alert center</h1>
          <p className="page-sub">
            {data.summary.total_unresolved || 0} unresolved ·
            {data.summary.critical || 0} critical ·
            {data.summary.warning || 0} warning
          </p>
        </div>
        <div className="header-actions">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={e => setShowResolved(e.target.checked)}
            />
            Show resolved
          </label>
        </div>
      </div>

      <div className="filter-row">
        {['ALL', 'CRITICAL', 'WARNING', 'UNRESOLVED'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {filter === 'ALL' ? 'No alerts detected. Cluster is healthy.' : `No ${filter.toLowerCase()} alerts.`}
        </div>
      ) : (
        <div className="alerts-list">
          {filtered.map(a => (
            <AlertCard
              key={a.id}
              alert={a}
              onResolve={handleResolve}
              onExplain={handleExplain}
              explaining={explaining}
            />
          ))}
        </div>
      )}
    </div>
  )
}
