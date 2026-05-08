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
      const errors: string[] = []

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          continue
        }
        try {
          const url = await uploadListingImage(file)
          newUrls.push(url)
        } catch (err) {
          errors.push(err instanceof Error ? err.message : 'Upload failed')
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
      }

      if (errors.length > 0) {
        setError(`Uploaded ${newUrls.length} files. ${errors.length} failed: ${errors.join('; ')}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      document.getElementById('file-input')?.click()
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
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
        aria-label="Upload images - drag and drop or click to select"
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
          {value.map((url) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden bg-slate-100"
            >
              <img
                src={url}
                alt="Uploaded photo"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(value.indexOf(url))}
                className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                disabled={uploading}
                aria-label="Remove photo"
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
