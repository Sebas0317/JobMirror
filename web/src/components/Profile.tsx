import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/profile')
      .then(res => setProfile(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Cargando perfil…</div>;
  if (!profile) return (
    <div className="p-4">
      <h2>Sin perfil</h2>
      <p>Sube un CV desde el CLI: job-monitor profile upload &lt;cv.pdf&gt;</p>
      <Link to="/" style={{ color: '#2563eb' }}>← Volver</Link>
    </div>
  );

  const skills = profile.skills ?? [];
  const targetRoles = profile.targetRoles ?? [];
  const locations = profile.preferredLocations ?? [];
  const avoid = profile.avoidKeywords ?? [];
  const searchMode = profile.searchMode ?? 'busqueda_activa';

  return (
    <div className="p-4" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← Dashboard</Link>

      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>{profile.name}</h2>
      <p style={{ color: '#666' }}>
        {profile.seniority} · {profile.experience} años exp.
      </p>

      <div style={{
        background: '#f0fdf4',
        borderRadius: 8,
        padding: '8px 14px',
        marginTop: 12,
        border: '1px solid #bbf7d0',
        display: 'inline-block',
        fontSize: 13,
        fontWeight: 600,
        color: searchMode === 'busqueda_activa' ? '#0f766e' : '#92400e',
      }}>
        {searchMode === 'busqueda_activa' ? '🔍 Búsqueda Activa' : '🎯 Carrera Ideal'}
      </div>

      {profile.education && (
        <section style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Educación</h3>
          <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {profile.education}
          </div>
        </section>
      )}

      <section style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Skills ({skills.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {skills.sort((a: any, b: any) => b.rating - a.rating).map((s: any) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 140, fontWeight: 500 }}>{s.name}</span>
              <div style={{
                flex: 1,
                height: 10,
                background: '#e5e7eb',
                borderRadius: 5,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(s.rating / 10) * 100}%`,
                  height: '100%',
                  background: s.rating >= 7 ? '#22c55e' : s.rating >= 4 ? '#f59e0b' : '#ef4444',
                  borderRadius: 5,
                }} />
              </div>
              <span style={{ fontSize: 12, color: '#666', width: 30, textAlign: 'right' }}>{s.rating}/10</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Roles Objetivo</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {targetRoles.map((r: string) => (
            <span key={r} style={{ padding: '4px 10px', background: '#dbeafe', borderRadius: 12, fontSize: 13 }}>
              {r}
            </span>
          ))}
        </div>
      </section>

      {locations.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Ubicaciones</h3>
          <p style={{ color: '#666', fontSize: 14 }}>{locations.join(', ')}</p>
        </section>
      )}

      {avoid.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Evitar</h3>
          <p style={{ color: '#ef4444', fontSize: 14 }}>{avoid.join(', ')}</p>
        </section>
      )}
    </div>
  );
}
