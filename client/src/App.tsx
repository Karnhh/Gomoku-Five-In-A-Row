import { lazy, Suspense, useEffect } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Play from './pages/Play.tsx';
import Room from './pages/Room.tsx';
import Manual from './pages/Manual.tsx';
import { ONLINE_ENABLED } from './online/flag.ts';
import Patterns from './pages/Patterns.tsx';
import References from './pages/References.tsx';
import { LangToggle, useLang } from './i18n.tsx';

const Theory = lazy(() => import('./pages/Theory.tsx'));
const Analyze = lazy(() => import('./pages/Analyze.tsx'));

export default function App() {
  const { t } = useLang();
  const { pathname, hash } = useLocation();

  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="brand" aria-label={t('หมากห้าตัว หน้าแรก', 'Gomoku home')}>
          <span className="brand-mark"><i className="b" /><i className="w" /></span>
          <span className="brand-text">{t('หมากห้าตัว', 'Gomoku')}</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end className="link home-link">{t('หน้าแรก', 'Home')}</NavLink>
          <NavLink to="/play" className="link">{t('เล่น', 'Play')}</NavLink>
          <NavLink to="/theory" className="link">{t('ทฤษฎี', 'Theory')}</NavLink>
          <NavLink to="/patterns" className="link">{t('รูปแบบหมาก', 'Patterns')}</NavLink>
          <NavLink to="/analyze" className="link">{t('ตาต่อไป', 'Next move')}</NavLink>
        </div>
        <LangToggle />
      </nav>
      <Suspense fallback={<div className="loading">{t('กำลังโหลด…', 'Loading…')}</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/room/:code" element={ONLINE_ENABLED ? <Room /> : <Navigate to="/play" replace />} />
          <Route path="/manual" element={<Manual />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/patterns" element={<Patterns />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/references" element={<References />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
      <footer className="footer">
        <span>
          {t(
            'เนื้อหาทฤษฎีอ้างอิงจากสไลด์ Game playing (บทที่ 6) ประกอบตำรา AIMA ของ Russell & Norvig · ทำเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์',
            'Theory based on the Game playing (Chapter 6) slides for Russell & Norvig’s AIMA · Educational, non-commercial',
          )}
        </span>
        <span className="footer-links">
          <Link to="/manual">{t('คู่มือการใช้งาน', 'User manual')}</Link>
          <Link to="/references">{t('ดูแหล่งอ้างอิง →', 'See references →')}</Link>
        </span>
      </footer>
    </div>
  );
}
