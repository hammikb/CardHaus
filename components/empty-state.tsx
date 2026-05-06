import { ReactNode } from 'react'
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  actionText?: string
  actionHref?: string
  actionOnClick?: () => void
  icon?: ReactNode
}

export default function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  actionOnClick,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-5xl text-slate-300">{icon}</div>
      )}
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-sm">{description}</p>
      {actionText && (
        actionHref ? (
          <Link
            href={actionHref}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-smooth focus-visible-ring"
          >
            {actionText}
          </Link>
        ) : (
          <button
            onClick={actionOnClick}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition-smooth focus-visible-ring"
          >
            {actionText}
          </button>
        )
      )}
    </div>
  )
}
