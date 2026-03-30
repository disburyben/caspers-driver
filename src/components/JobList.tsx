import { Job } from '../App.tsx'
import { MapPin, ChevronRight, Package } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  dispatched: 'bg-amber-500/20 text-amber-400',
  in_progress: 'bg-cyan-500/20 text-cyan-400',
}

interface Props {
  jobs: Job[]
  onSelect: (job: Job) => void
}

export default function JobList({ jobs, onSelect }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
          <Package className="w-7 h-7 text-gray-700" />
        </div>
        <p className="text-gray-500 font-semibold">No jobs assigned yet</p>
        <p className="text-gray-700 text-sm mt-1">Pull down to refresh</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600 font-semibold tracking-wider mb-2">YOUR JOBS TODAY</p>
      {jobs.map(job => (
        <button
          key={job.id}
          onClick={() => onSelect(job)}
          className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-lg font-black text-white">#{job.id}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-bold text-white truncate">{job.name}</p>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || 'bg-gray-700 text-gray-300'}`}>
                  {job.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-400 truncate">{job.pickup}</p>
                </div>
                <div className="flex items-center gap-2 pl-1">
                  <div className="w-px h-3 bg-gray-700 ml-0.5" />
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                  <p className="text-sm text-gray-400 truncate">{job.dropoff}</p>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0 mt-3" />
          </div>
        </button>
      ))}
    </div>
  )
}
