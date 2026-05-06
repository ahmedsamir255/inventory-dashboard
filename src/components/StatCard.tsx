interface Props { title: string; value: string; sub?: string; color?: 'blue'|'green'|'red'|'yellow'|'gray'; icon: string; }
const c = { blue:'bg-blue-50 border-blue-200 text-blue-700', green:'bg-green-50 border-green-200 text-green-700', red:'bg-red-50 border-red-200 text-red-700', yellow:'bg-yellow-50 border-yellow-200 text-yellow-700', gray:'bg-gray-50 border-gray-200 text-gray-700' }
export default function StatCard({ title, value, sub, color='gray', icon }: Props) {
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${c[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide opacity-60">{title}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
      </div>
    </div>
  )
}
