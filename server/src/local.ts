// Local development only. On Vercel the app is imported by api/index.ts instead.
import app from './app.ts';

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  const where = process.env.MONGODB_URI ? 'MongoDB' : 'memory (no MONGODB_URI set; rooms vanish on restart)';
  console.log(`API on http://localhost:${port} · rooms stored in ${where}`);
});
