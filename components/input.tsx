'use client'
import { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  icon?: ReactNode
}

export default function Input({
  label,
  helperText,
  error,
  icon,
  className = '',
  ...props
}: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-slate-900">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          className={`w-full border rounded-lg px-4 py-2.5 transition-smooth focus-visible-ring placeholder-slate-400
            ${error
              ? 'border-red-500 bg-red-50 text-red-900'
              : 'border-slate-300 focus:border-blue-500'
            }
            ${icon ? 'pl-10' : ''}
            ${className}`}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm font-medium text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  )
}
