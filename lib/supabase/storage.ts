import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function uploadListingImage(file: File): Promise<string> {
  const bucket = 'listing-images'
  const fileName = `${Date.now()}-${file.name}`

  const { error, data } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: publicUrl } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl.publicUrl
}
