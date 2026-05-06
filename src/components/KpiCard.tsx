interface KpiCardProps {
  title: string
  value: string | number
  subValue?: string
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray'
  icon?: string
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
}

export default function KpiCard({ title, value, subValue, color, icon }: KpiCardProps) {
  return (
    <div className={`p-4 rounded-xl border-2 ${colorClasses[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{icon} {title}</p>
      <p className="text-2xl font-bold">{value}</p>
      {subValue && <p className="text-xs opacity-60 mt-1">{subValue}</p>}
    </div>
  )
}
