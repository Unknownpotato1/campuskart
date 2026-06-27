// Force the Node.js runtime for all API routes under /api.
// firebase-admin requires Node built-ins (crypto, fs, etc.) that aren't
// available in the Edge runtime. This layout ensures every /api/* route
// runs on Node.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
