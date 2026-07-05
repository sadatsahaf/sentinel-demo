import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchCost } from '../api'

const TEAM_COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777']

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-val" style={{ color: color || 'inherit' }}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}

export default function CostReport() {
  const [data, setData] = useState(null)

  const load = async () => {
    try {
      const d = await fetchCost()
      setData(d)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])

  if (!data) return <div className="page"><div className="empty-state">Loading cost data...</div></div>

  const savingsIfOptimized = data.waste_monthly * 0.7

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cost report</h1>
          <p className="page-sub">
            {data.idle_nodes} idle nodes · ${data.idle_cost_hourly.toFixed(2)}/hr in waste
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Hourly cluster cost"
          value={`$${data.hourly_rate.toFixed(2)}`}
          sub="all 6 nodes powered on"
        />
        <StatCard
          label="Idle GPU waste/hr"
          value={`$${data.idle_cost_hourly.toFixed(2)}`}
          sub={`${data.idle_nodes} nodes idle`}
          color="#c0392b"
        />
        <StatCard
          label="Projected monthly waste"
          value={`$${data.waste_monthly.toFixed(0)}`}
          sub="if idle pattern continues"
          color="#c0392b"
        />
        <StatCard
          label="Recoverable savings"
          value={`$${savingsIfOptimized.toFixed(0)}/mo`}
          sub="with auto-scale optimization"
          color="#1a9e6e"
        />
      </div>

      <div className="two-col" style={{ marginTop: '2rem' }}>
        <div className="col-main">
          <div className="section-title">Spend by team</div>
          {data.team_breakdown.length === 0 ? (
            <div className="empty-state">No team data yet</div>
          ) : (
            <>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.team_breakdown} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="team" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v.toFixed(0)}`} />
                    <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Cost']} />
                    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                      {data.team_breakdown.map((_, i) => (
                        <Cell key={i} fill={TEAM_COLORS[i % TEAM_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="team-table">
                <div className="team-table-header">
                  <span>Team</span>
                  <span>Jobs</span>
                  <span>Runtime</span>
                  <span>Cost</span>
                </div>
                {data.team_breakdown.map((t, i) => (
                  <div key={t.team} className="team-table-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: TEAM_COLORS[i % TEAM_COLORS.length],
                        display: 'inline-block'
                      }} />
                      {t.team}
                    </span>
                    <span>{t.jobs}</span>
                    <span>{t.runtime_hours.toFixed(1)}h</span>
                    <span style={{ fontWeight: 500 }}>${t.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="col-side">
          <div className="section-title">Idle nodes</div>
          {data.idle_node_names.length === 0 ? (
            <div className="empty-state small">No idle nodes detected</div>
          ) : (
            <div className="idle-list">
              {data.idle_node_names.map(name => (
                <div key={name} className="idle-item">
                  <span className="idle-dot" />
                  <span className="idle-name">{name}</span>
                  <span className="idle-cost">${(3.40).toFixed(2)}/hr wasted</span>
                </div>
              ))}
              <div className="idle-recommendation">
                SENTINEL recommends deallocating idle nodes immediately.
                Estimated monthly recovery: ${(data.idle_nodes * 3.40 * 24 * 30 * 0.7).toFixed(0)}
              </div>
            </div>
          )}

          <div className="section-title" style={{ marginTop: '1.5rem' }}>
            Optimization checklist
          </div>
          <div className="checklist">
            {[
              ['Enable auto-scale down after 15min idle', data.idle_nodes > 0],
              ['Set GPU memory limits per team', true],
              ['Schedule overnight jobs for off-peak hours', true],
              ['Add crash alerts for unmonitored jobs', true],
              ['Review overrunning jobs weekly', true],
            ].map(([item, urgent]) => (
              <div key={item} className="checklist-item">
                <span className="check-icon" style={{ color: urgent ? '#c0392b' : '#1a9e6e' }}>
                  {urgent ? '○' : '✓'}
                </span>
                <span className="check-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
