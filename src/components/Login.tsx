import { useState } from 'react'
import { Driver } from '../App.tsx'
import { Truck, Delete } from 'lucide-react'

interface Props {
  onLogin: (driver: Driver) => void
}

export default function Login({ onLogin }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const tap = (d: string) => {
    if (pin.length < 6) setPin(p => p + d)
    setError('')
  }
  const del = () => setPin(p => p.slice(0, -1))

  const submit = async () => {
    if (pin.length < 4) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (data.driver) {
        onLogin(data.driver)
      } else {
        setError('Wrong PIN. Try again.')
        setPin('')
      }
    } catch {
      setError('Connection error. Check your internet.')
    } finally {
      setLoading(false)
    }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Truck className="w-9 h-9 text-black" />
        </div>
        <h1 className="font-black text-2xl tracking-tight">CASPERS</h1>
        <p className="text-gray-600 text-sm tracking-widest mt-1">DRIVER APP</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-8">
        {[0,1,2,3,4,5].map(i => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${
              i < pin.length
                ? 'bg-cyan-500 border-cyan-500'
                : 'border-gray-700'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {KEYS.map((k, i) => {
          if (k === '') return <div key={i} />
          if (k === '⌫') return (
            <button
              key={i}
              onClick={del}
              className="h-16 rounded-2xl bg-gray-900 flex items-center justify-center active:scale-90 transition-transform"
            >
              <Delete className="w-5 h-5 text-gray-400" />
            </button>
          )
          return (
            <button
              key={i}
              onClick={() => tap(k)}
              className="h-16 rounded-2xl bg-gray-900 text-white text-xl font-bold active:scale-90 active:bg-gray-800 transition-all"
            >
              {k}
            </button>
          )
        })}
      </div>

      {/* Login button */}
      <button
        onClick={submit}
        disabled={pin.length < 4 || loading}
        className="mt-6 w-72 py-4 rounded-2xl bg-cyan-500 text-black font-black text-base tracking-wider disabled:opacity-30 active:scale-95 transition-transform"
      >
        {loading ? 'CHECKING...' : 'LOG IN'}
      </button>

      <p className="mt-6 text-gray-700 text-xs text-center">
        Enter the PIN given to you by your dispatcher
      </p>
    </div>
  )
}
