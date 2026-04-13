import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';

export default function StatsCard({ title, value, change, changeLabel, icon: Icon, iconBg = 'bg-brand-50', iconColor = 'text-brand-600' }) {
  const isPositive = change >= 0;

  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {Icon && (
          <div className={`h-10 w-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`inline-flex items-center text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
          <span className="text-xs text-gray-400">{changeLabel || 'vs last month'}</span>
        </div>
      )}
    </div>
  );
}
