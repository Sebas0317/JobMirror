import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import VacancyDetail from './components/VacancyDetail';
import Profile from './components/Profile';
import ProfileUpload from './components/ProfileUpload';

function App() {
  return (
    <Router>
      <nav className="nav">
        <NavLink to="/" className="nav-brand" end>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          JobMirror
        </NavLink>
        <NavLink to="/" className="nav-link" end>Vacantes</NavLink>
        <NavLink to="/profile" className="nav-link">Perfil</NavLink>
        <NavLink to="/profile/upload" className="nav-link">Subir CV</NavLink>
      </nav>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vacancy/:id" element={<VacancyDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/upload" element={<ProfileUpload />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
