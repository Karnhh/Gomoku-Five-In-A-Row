// Online play needs the API server and MongoDB. It stays hidden until the
// build is told otherwise: set VITE_ONLINE=true (in client/.env.local for
// development, or in the Vercel project's environment variables).
export const ONLINE_ENABLED = import.meta.env.VITE_ONLINE === 'true';
