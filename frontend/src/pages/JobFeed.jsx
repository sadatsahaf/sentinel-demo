import { useState, useEffect } from 'react'
import { fetchJobs, scheduleJob } from '../api'

const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma']
const JOB_NAMES = [
  'llm-finetune', 'image-classifier', 'bert-training',
  'diffusion-model', 'transformer-xl', 'nlp-pipeline',
  'vision-transformer', 'speech-model', 'gan-training'
]
const TEAM_COLOR = {
  Alpha: '#4f46e5', Beta: '#0891b2', Gamma: '#059669',
  Delta: '#d97706', Sigma: '#db2777'
}

function JobRow({ job }) {
  const overrun = job.overrun
  const runtimePct = Math.min(100, (job.runtime_hours / Math.max(job.expected_duration, 0.1)) * 100)
  const teamColor = TEAM_COLOR[job.team] || '#6b7280'

  return (
    <div className={`job-row ${overrun ? 'overrun' : ''}`}>
      <div className="job-left">
        <div className="job-name">{job.name}</div>
        <div className="job-meta">
          <span className="team-pill" style={{ background: teamColor }}>{job.team}</span>
          <span className="job-node">{job.node_name}</span>
          {overrun && <span className="overrun-badge">OVERRUN</span>}
        </div>
      </div>
      <div className="job-middle">
        <div className="job-time-row">
          <span className="job-time-val">{job.runtime_hours.toFixed(1)}h</span>
          <span className="job-time-sep">/</span>
          <span className="job-time-expected">{job.expected_duration.toFixed(1)}h expected</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${runtimePct}%`,
              background: overrun ? '#c0392b' : '#1a9e6e'
            }}
          />
        </div>
      </div>
      <div className="job-right">
        <div className="job-cost">${job.cost_so_far.toFixed(2)}</div>
        <div className="job-cost-label">spent</div>
        <div className="job-gpu">{job.gpu_reserved.toFixed(0)}% GPU</div>
      </div>
    </div>
  )
}

export default function JobFeed() {
  const [data, setData] = useState({ jobs: [], summary: {} })
  const [form, setForm] = useState({ team: 'Alpha', job_name: 'llm-finetune', gpu_required: 40 })
  const [scheduling, setScheduling] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const load = async () => {
    try {
      const d = await fetchJobs()
      setData(d)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [])

  const handleSchedule = async () => {
    setScheduling(true)
    setResult(null)
    setError(null)
    try {
      const res = await scheduleJob(form.team, form.job_name, form.gpu_required)
      setResult(res)
      load()
    } catch (e) {
      setError(e.response?.data?.detail || 'Scheduling failed')
    } finally {
      setScheduling(false)
    }
  }

  const overrunJobs = data.jobs.filter(j => j.overrun)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job feed</h1>
          <p className="page-sub">
            {data.summary.total || 0} running · {overrunJobs.length} overruns · 
            ${(data.summary.total_cost_so_far || 0).toFixed(2)} total spend
          </p>
        </div>
      </div>

      <div className="two-col">
        <div className="col-main">
          <div className="section-title">Running jobs</div>
          {data.jobs.length === 0 ? (
            <div className="empty-state">No jobs running</div>
          ) : (
            <div className="job-list">
              {data.jobs
                .sort((a, b) => b.overrun - a.overrun || b.cost_so_far - a.cost_so_far)
                .map(j => <JobRow key={j.id} job={j} />)}
            </div>
          )}
        </div>

        <div className="col-side">
          <div className="section-title">Schedule a job</div>
          <div className="schedule-card">
            <div className="form-field">
              <label className="form-label">Team</label>
              <select
                className="form-select"
                value={form.team}
                onChange={e => setForm({ ...form, team: e.target.value })}
              >
                {TEAMS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Job name</label>
              <select
                className="form-select"
                value={form.job_name}
                onChange={e => setForm({ ...form, job_name: e.target.value })}
              >
                {JOB_NAMES.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">GPU required: {form.gpu_required}%</label>
              <input
                type="range" min="10" max="80" step="5"
                value={form.gpu_required}
                onChange={e => setForm({ ...form, gpu_required: Number(e.target.value) })}
                className="form-range"
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleSchedule}
              disabled={scheduling}
            >
              {scheduling ? 'Scheduling...' : 'Schedule job →'}
            </button>

            {result && (
              <div className="result-success">
                <div className="result-title">Job scheduled</div>
                <div className="result-detail">{result.message}</div>
                <div className="result-detail">Score: {result.scheduling_score}</div>
              </div>
            )}
            {error && (
              <div className="result-error">
                <div className="result-title">Failed</div>
                <div className="result-detail">{error}</div>
              </div>
            )}
          </div>

          {overrunJobs.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: '1.5rem', color: '#c0392b' }}>
                Overrunning jobs
              </div>
              <div className="overrun-list">
                {overrunJobs.map(j => (
                  <div key={j.id} className="overrun-item">
                    <div className="overrun-name">{j.name}</div>
                    <div className="overrun-detail">
                      {j.runtime_hours.toFixed(1)}h / {j.expected_duration.toFixed(1)}h · 
                      ${j.cost_so_far.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
