'use client'
import { useState } from 'react'

interface PhotoUploadProps {
  value: string[]
  onChange: (images: string[]) => void
  maxFiles?: number
}

export default function PhotoUpload({ value, onChange, maxFiles = 5 }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList) {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (newFiles.length === 0) return

    const remaining = maxFiles - value.length
    const toAdd = newFiles.slice(0, remaining)

    toAdd.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          onChange([...value, e.target.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="block text-sm font-bold text-slate-900 mb-2">
        Photos * ({value.length}/{maxFiles})
      </label>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50'
        } ${value.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFiles(e.currentTarget.files!)}
          className="hidden"
          id="photo-input"
          disabled={value.length >= maxFiles}
        />
        <label htmlFor="photo-input" className="cursor-pointer block">
          <p className="text-slate-600 font-medium">Drag photos here or click to select</p>
          <p className="text-sm text-slate-500 mt-1">JPG, PNG, WebP up to 5 images</p>
        </label>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {value.map((img, idx) => (
            <div key={idx} className="relative">
              <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
