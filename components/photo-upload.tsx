'use client'
import { useState } from 'react'
import { uploadListingImage } from '@/lib/supabase/storage'

interface PhotoUploadProps {
  value: string[]
  onChange: (images: string[]) => void
  maxFiles?: number
}

export default function PhotoUpload({ value, onChange, maxFiles = 5 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList) {
    if (files.length + value.length > maxFiles) {
      setError(`Max ${maxFiles} files allowed`)
      return
    }

    setUploading(true)
    setError('')

    try {
      const newUrls: string[] = []
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          continue
        }
        const url = await uploadListingImage(file)
        newUrls.push(url)
      }
      onChange([...value, ...newUrls])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('border-blue-400')
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove('border-blue-400')}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-blue-400')
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={uploading}
        />
        <p className="text-slate-600 font-medium">
          {uploading ? 'Uploading...' : 'Drag photos here or click to select'}
        </p>
        <p className="text-slate-400 text-sm mt-1">Max {maxFiles} images</p>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {value.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100"
            >
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
