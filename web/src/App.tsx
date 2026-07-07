import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import VacancyDetail from './components/VacancyDetail';
import Profile from './components/Profile';
import ProfileUpload from './components/ProfileUpload';

function App() {
  return (
    <Router>
      <nav style={{ padding: '12px 16px', background: '#1f2937', display: 'flex', gap: 20, alignItems: 'center' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: 16 }}>
          Job Monitor AI
        </Link>
        <Link to="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Vacantes</Link>
        <Link to="/profile" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Perfil</Link>
        <Link to="/profile/upload" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 14 }}>Subir CV</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vacancy/:id" element={<VacancyDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/upload" element={<ProfileUpload />} />
      </Routes>
    </Router>
  );
}

export default App;
