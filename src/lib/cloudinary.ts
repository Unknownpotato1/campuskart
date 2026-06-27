import { v2 as cloudinary } from "cloudinary"

// Server-side Cloudinary access for image uploads.
// Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// env vars. Sign up free at https://cloudinary.com (no credit card, 25GB free).

export const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
)

let configured = false
function ensureConfigured() {
  if (configured) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

/**
 * Upload an image buffer to Cloudinary and return its secure URL.
 * Images are stored under a `campuskart/{userId}/` folder for organization.
 */
export async function uploadImageToCloudinary(params: {
  buffer: Buffer
  userId: string
  filename?: string
  contentType?: string
}): Promise<string> {
  ensureConfigured()
  const { buffer, userId } = params
  // Use a folder per user so the Cloudinary media library stays organized.
  const folder = `campuskart/${userId}`
  const publicId = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        public_id: publicId,
        folder,
        // Let Cloudinary auto-pick the best format/quality for the URL.
        // We keep the original on upload; transformations are applied via URL.
        overwrite: false,
        unique_filename: true,
      },
      (err, result) => {
        if (err) {
          reject(err)
          return
        }
        if (!result?.secure_url) {
          reject(new Error("Cloudinary upload returned no URL"))
          return
        }
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}
