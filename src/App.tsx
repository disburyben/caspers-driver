import { useState, useEffect, useCallback } from 'react'
import Login from './components/Login.tsx'
import JobList from './components/JobList.tsx'
import JobDetail from './components/JobDetail.tsx'
import { Truck, LogOut, RefreshCw } from 'lucide-react'

export interface Driver {
  id: number
  name: string
  phone: string
}

export interface Job {
  id: number
  name: string
  phone: string
  pickup: string
  dropoff: string
  bike_make: string
  bike_model: string
  service_type: string
  notes: string
  status: string
  assigned_driver_name: string | null
  created_at: string
}

const STORAGE_KEY = 'caspers_driver'

export default function App() {
  const [driver, setDriver] = useState<Driver | null>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null }
  })
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchJobs = useCallback(async (silent = false) => {
    if (!driver) return
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch(`/api/jobs?driver_id=${driver.id}`)
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [driver])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(() => fetchJobs(true), 20000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  const login = (d: Driver) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    setDriver(d)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setDriver(null)
    setJobs([])
  }

  const updateJob = async (id: number, status: string, photoData?: string, photoNote?: string) => {
    const res = await fetch(`/api/jobs?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, photo_data: photoData, photo_note: photoNote }),
    })
    const data = await res.json()
    if (data.job) {
      setJobs(prev => prev.filter(j => j.id !== id || !['completed', 'cancelled'].includes(status)))
      if (selectedJob?.id === id) {
        if (['completed', 'cancelled'].includes(status)) setSelectedJob(null)
        else setSelectedJob(data.job)
      }
    }
    return data
  }

  if (!driver) return <Login onLogin={login} />

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur border-b border-gray-900 px-4 py-3 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="font-black text-sm text-white">{driver.name}</p>
              <p className="text-[10px] text-gray-600 tracking-wider">CASPERS DRIVER</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-400 font-semibold">{jobs.length} JOB{jobs.length !== 1 ? 'S' : ''}</span>
            </div>
            <button
              onClick={() => fetchJobs(true)}
              className="p-2 rounded-lg bg-gray-900 active:scale-95 transition-transform"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-gray-900 active:scale-95 transition-transform"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 text-sm">Loading your jobs...</p>
          </div>
        ) : (
          <JobList jobs={jobs} onSelect={setSelectedJob} />
        )}
      </main>

      {selectedJob && (
        <JobDetail
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={updateJob}
        />
      )}
    </div>
  )
}
