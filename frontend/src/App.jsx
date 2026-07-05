import { useState, useEffect } from 'react'
import WarRoom from './pages/WarRoom'
import JobFeed from './pages/JobFeed'
import AlertCenter from './pages/AlertCenter'
import CostReport from './pages/CostReport'
import { fetchAlerts } from './api'
import './App.css'

const NAV = [
  { id: 'warroom', label: 'War room' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'cost', label: 'Cost' },
]

export default function App() {
  const [page, setPage] = useState('warroom')
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await fetchAlerts()
        setUnreadAlerts(data.summary.total_unresolved)
      } catch {}
    }
    poll()
    const t = setInterval(poll, 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">
          <span className="nav-logo">◈</span>
          <span className="nav-title">SENTINEL</span>
          <span className="nav-sub">GPU Cluster War Room</span>
        </div>
        <div className="nav-links">
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-btn ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              {n.label}
              {n.id === 'alerts' && unreadAlerts > 0 && (
                <span className="badge">{unreadAlerts}</span>
              )}
            </button>
          ))}
        </div>
        <div className="nav-live">
          <span className="pulse-dot" />
          Live
        </div>
      </nav>
      <main className="main">
        {page === 'warroom' && <WarRoom onNavigate={setPage} />}
        {page === 'jobs' && <JobFeed />}
        {page === 'alerts' && <AlertCenter />}
        {page === 'cost' && <CostReport />}
      </main>
    </div>
  )
}
