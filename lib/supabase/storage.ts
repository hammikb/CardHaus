import { createClient } from '@/lib/supabase/client'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function uploadListingImage(file: File): Promise<string> {
  const supabase = createClient()

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max 5MB`)
  }

  const bucket = 'listing-images'
  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`

  const { error, data } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  if (!data?.path) {
    throw new Error('Upload succeeded but returned no path')
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}
