// Runs the bundled app the way Vercel does: import api/index.js and hand it requests.
// Use it to check a bundle before deploying:  npm run bundle && npm start
import { createServer } from 'node:http';
import handler from '../api/index.js';

const port = Number(process.env.PORT ?? 3001);
createServer(handler).listen(port, () => console.log(`bundled API on http://localhost:${port}`));
