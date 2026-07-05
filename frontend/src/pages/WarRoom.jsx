import { useState, useEffect } from 'react'
import { fetchNodes, fetchCost, fetchAlerts } from '../api'

const STATUS_COLOR = { HEALTHY: '#1a9e6e', WARNING: '#d4850a', CRITICAL: '#c0392b' }
const STATUS_BG = { HEALTHY: '#e8f8f2', WARNING: '#fef3e2', CRITICAL: '#fdecea' }

function NodeTile({ node, onClick }) {
  const color = STATUS_COLOR[node.status]
  const bg = STATUS_BG[node.status]
  const tempPct = Math.min(100, ((node.gpu_temp - 40) / 60) * 100)
  const utilPct = node.gpu_util

  return (
    <div className="node-tile" style={{ borderColor: color, background: bg }} onClick={() => onClick(node)}>
      <div className="node-tile-header">
        <span className="node-name">{node.name}</span>
        <span className="node-status-dot" style={{ background: color }} />
      </div>
      <div className="node-stat">
        <span className="stat-label">GPU</span>
        <div className="mini-bar"><div style={{ width: `${utilPct}%`, background: color }} /></div>
        <span className="stat-val">{node.gpu_util}%</span>
      </div>
      <div className="node-stat">
        <span className="stat-label">Temp</span>
        <div className="mini-bar"><div style={{ width: `${tempPct}%`, background: node.gpu_temp > 85 ? '#c0392b' : color }} /></div>
        <span className="stat-val">{node.gpu_temp}°C</span>
      </div>
      <div className="node-meta">
        <span>{node.gpu_memory_used.toFixed(0)}/{node.gpu_memory_total}GB</span>
        <span>{node.power_draw.toFixed(0)}W</span>
      </div>
      {node.error_count > 0 && (
        <div className="node-error-badge">{node.error_count} errors</div>
      )}
    </div>
  )
}

function NodeModal({ node, onClose }) {
  if (!node) return null
  const color = STATUS_COLOR[node.status]
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: `3px solid ${color}` }}>
          <div>
            <h2 className="modal-title">{node.name}</h2>
            <span className="status-pill" style={{ background: color }}>{node.status}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-grid">
          {[
            ['GPU utilization', `${node.gpu_util}%`],
            ['GPU temperature', `${node.gpu_temp}°C`],
            ['GPU memory', `${node.gpu_memory_used.toFixed(1)} / ${node.gpu_memory_total} GB`],
            ['CPU utilization', `${node.cpu_util}%`],
            ['RAM used', `${node.ram_used.toFixed(1)}%`],
            ['Power draw', `${node.power_draw.toFixed(0)} W`],
            ['ECC errors', node.error_count],
            ['Uptime', `${node.uptime_hours.toFixed(0)}h`],
            ['Idle time', `${node.idle_minutes} min`],
            ['State', node.drift],
          ].map(([label, val]) => (
            <div key={label} className="modal-stat">
              <div className="modal-stat-label">{label}</div>
              <div className="modal-stat-val">{val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WarRoom({ onNavigate }) {
  const [nodes, setNodes] = useState([])
  const [summary, setSummary] = useState({})
  const [cost, setCost] = useState({})
  const [alerts, setAlerts] = useState([])
  const [selected, setSelected] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = async () => {
    try {
      const [nd, co, al] = await Promise.all([fetchNodes(), fetchCost(), fetchAlerts()])
      setNodes(nd.nodes)
      setSummary(nd.summary)
      setCost(co)
      setAlerts(al.alerts.slice(0, 4))
      setLastUpdated(new Date())
    } catch (e) {
      console.error('Load error', e)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL' && !a.resolved)
  const hourlyWaste = cost.idle_cost_hourly || 0

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cluster war room</h1>
          <p className="page-sub">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        {hourlyWaste > 0 && (
          <div className="waste-ticker">
            <span className="waste-label">Idle GPU waste</span>
            <span className="waste-amount">${hourlyWaste.toFixed(2)}/hr</span>
            <span className="waste-sub">${(hourlyWaste * 24 * 30).toFixed(0)}/mo projected</span>
          </div>
        )}
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: '#1a9e6e' }}>{summary.healthy ?? '—'}</div>
          <div className="kpi-label">Healthy</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: '#d4850a' }}>{summary.warning ?? '—'}</div>
          <div className="kpi-label">Warning</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val" style={{ color: '#c0392b' }}>{summary.critical ?? '—'}</div>
          <div className="kpi-label">Critical</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val">{summary.total ?? '—'}</div>
          <div className="kpi-label">Total nodes</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-val">${(cost.hourly_rate || 0).toFixed(2)}</div>
          <div className="kpi-label">$/hour</div>
        </div>
      </div>

      <div className="section-title">Node heatmap</div>
      <div className="node-grid">
        {nodes.map(n => (
          <NodeTile key={n.id} node={n} onClick={setSelected} />
        ))}
      </div>

      {criticalAlerts.length > 0 && (
        <>
          <div className="section-title" style={{ color: '#c0392b', marginTop: '2rem' }}>
            Active critical alerts
          </div>
          <div className="alert-strip">
            {criticalAlerts.map(a => (
              <div key={a.id} className="alert-row critical">
                <div className="alert-type">{a.type}</div>
                <div className="alert-msg">{a.message}</div>
                <button className="link-btn" onClick={() => onNavigate('alerts')}>
                  View →
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <NodeModal node={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
