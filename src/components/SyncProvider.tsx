import { useEffect, useState } from 'react'
import { useInventoryStore } from '../store/useInventoryStore'
import { ping } from '../lib/api'

export default function SyncProvider({ children }: { children: React.ReactNode }) {
  const loadFromServer = useInventoryStore(s => s.loadFromServer)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    // Initial load
    loadFromServer()

    // Poll every 5 seconds
    const interval = setInterval(async () => {
      const ok = await ping()
      setOnline(ok)
      if (ok) loadFromServer()
    }, 5000)

    // First ping
    ping().then(setOnline)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {children}
      {/* Sync indicator */}
      <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg transition-all z-50
        ${online === null ? 'bg-gray-100 text-gray-500' : online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <span className={`w-2 h-2 rounded-full ${online === null ? 'bg-gray-400' : online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}/>
        {online === null ? 'جاري الاتصال...' : online ? 'متزامن' : 'انقطع الاتصال'}
      </div>
    </>
  )
}
