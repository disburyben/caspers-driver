import { useState, useRef } from 'react'
import { Job } from '../App.tsx'
import { X, MapPin, Phone, FileText, Camera, CheckCircle, Bike, ChevronRight } from 'lucide-react'

const STATUS_NEXT: Record<string, { label: string; next: string; color: string }> = {
  new: { label: 'ACCEPT JOB', next: 'dispatched', color: 'bg-blue-500' },
  dispatched: { label: 'START JOB', next: 'in_progress', color: 'bg-amber-500' },
  in_progress: { label: 'MARK DELIVERED', next: 'completed', color: 'bg-green-500' },
}

interface Props {
  job: Job
  onClose: () => void
  onUpdate: (id: number, status: string, photoData?: string, photoNote?: string) => Promise<unknown>
}

export default function JobDetail({ job, onClose, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [photoNote, setPhotoNote] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const action = STATUS_NEXT[job.status]

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      // Resize to max 800px to keep it small
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const max = 800
        let w = img.width, h = img.height
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max }
          else { w = Math.round(w * max / h); h = max }
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        setPhotoData(canvas.toDataURL('image/jpeg', 0.7))
        setShowCamera(false)
      }
      img.src = result
    }
    reader.readAsDataURL(file)
  }

  const advance = async () => {
    if (!action) return
    setUpdating(true)
    const isCompleting = action.next === 'completed'
    await onUpdate(job.id, action.next, isCompleting ? photoData || undefined : undefined, isCompleting ? photoNote || undefined : undefined)
    if (isCompleting) setDone(true)
    setUpdating(false)
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">JOB COMPLETE</h2>
        <p className="text-gray-500 text-sm text-center mb-8">#{job.id} — {job.name} has been marked as delivered</p>
        <button onClick={onClose} className="w-full max-w-xs py-4 rounded-2xl bg-cyan-500 text-black font-black text-base">
          BACK TO JOBS
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="flex-1 bg-black/60" />
      <div
        className="bg-[#111] border-t border-gray-800 rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 pb-10">
          {/* Header */}
          <div className="flex items-start justify-between mt-3 mb-5">
            <div>
              <p className="text-xs text-gray-600 font-semibold tracking-wider">JOB #{job.id}</p>
              <h2 className="text-xl font-black text-white mt-0.5">{job.name}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-gray-900 active:scale-95">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Route card */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex flex-col items-center gap-1 mt-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="w-px flex-1 bg-gray-700 h-6" />
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] text-gray-600 font-semibold tracking-wider">PICKUP</p>
                  <p className="text-white text-sm font-semibold mt-0.5">{job.pickup}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 font-semibold tracking-wider">DROPOFF</p>
                  <p className="text-white text-sm font-semibold mt-0.5">{job.dropoff}</p>
                </div>
              </div>
            </div>
            <a
              href={`https://maps.apple.com/?daddr=${encodeURIComponent(job.dropoff)}`}
              className="mt-1 w-full py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.99]"
              onClick={e => e.stopPropagation()}
            >
              <MapPin className="w-3.5 h-3.5" />
              OPEN IN MAPS
            </a>
          </div>

          {/* Customer details */}
          <div className="bg-gray-900 rounded-2xl p-4 mb-4 space-y-3">
            <a href={`tel:${job.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-3 active:opacity-70">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-600 font-semibold tracking-wider">CALL CUSTOMER</p>
                <p className="text-cyan-400 font-bold text-sm">{job.phone}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-700 ml-auto" />
            </a>

            {(job.bike_make || job.bike_model) && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 font-semibold tracking-wider">BIKE</p>
                  <p className="text-white text-sm font-semibold">{[job.bike_make, job.bike_model].filter(Boolean).join(' ')}</p>
                </div>
              </div>
            )}

            {job.notes && (
              <div className="flex items-start gap-3 pt-2 border-t border-gray-800">
                <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center mt-0.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 font-semibold tracking-wider">NOTES</p>
                  <p className="text-gray-300 text-sm mt-0.5">{job.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Photo section — only show when completing */}
          {job.status === 'in_progress' && (
            <div className="bg-gray-900 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">DELIVERY PHOTO</p>
              {photoData ? (
                <div>
                  <img src={photoData} alt="Delivery" className="w-full rounded-xl mb-2 max-h-48 object-cover" />
                  <button onClick={() => setPhotoData(null)} className="text-xs text-gray-600 w-full text-center">Remove photo</button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center gap-2 text-gray-500 text-sm active:scale-[0.99]"
                >
                  <Camera className="w-5 h-5" />
                  Take delivery photo
                </button>
              )}
              {photoData && (
                <input
                  value={photoNote}
                  onChange={e => setPhotoNote(e.target.value)}
                  placeholder="Add a note (optional)"
                  className="mt-2 w-full bg-black border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none"
                />
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>
          )}

          {/* Action button */}
          {action && (
            <button
              onClick={advance}
              disabled={updating}
              className={`w-full py-5 rounded-2xl font-black text-base tracking-wider text-white active:scale-[0.99] disabled:opacity-50 transition-transform ${action.color}`}
            >
              {updating ? '...' : action.label}
            </button>
          )}

          {job.status === 'completed' && (
            <div className="flex items-center justify-center gap-2 py-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-400 font-bold">Job Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
