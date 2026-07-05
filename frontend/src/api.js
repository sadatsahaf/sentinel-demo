import axios from 'axios'

const BASE = 'http://127.0.0.1:8000'
const api = axios.create({ baseURL: BASE, timeout: 8000 })

export const fetchNodes = () => api.get('/nodes').then(r => r.data)
export const fetchJobs = () => api.get('/jobs').then(r => r.data)
export const fetchAlerts = (includeResolved = false) =>
  api.get(`/alerts?include_resolved=${includeResolved}`).then(r => r.data)
export const fetchCost = () => api.get('/cost').then(r => r.data)
export const resolveAlert = (id) => api.post(`/alerts/${id}/resolve`).then(r => r.data)
export const explainAlert = (id) => api.post(`/alerts/${id}/explain`).then(r => r.data)
export const scheduleJob = (team, jobName, gpuRequired) =>
  api.post('/schedule', { team, job_name: jobName, gpu_required: gpuRequired }).then(r => r.data)
