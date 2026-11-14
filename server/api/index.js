// Vercel entry point: the whole Express app runs as one serverless function.
// dist/app.cjs is produced by "npm run vercel-build" (scripts/bundle.mjs).
import bundle from '../dist/app.cjs';

// the bundle is CommonJS, so the Express app is its "default" property
export default bundle.default ?? bundle;
