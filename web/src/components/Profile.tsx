import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/profile').then(r => { setProfile(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>;
  }

  if (!profile) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>No hay perfil todavía.</p>
        <a href="/profile/upload" className="btn btn-primary">Subir CV</a>
      </div>
    );
  }

  return (
    <div className="grid-2">
      {/* Info card */}
      <div className="card">
        <div className="card-header">Perfil</div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{profile.name}</div>
            <div className="text-sm text-secondary" style={{ marginTop: 2 }}>
              {profile.seniority} · {profile.experience} años de experiencia
            </div>
          </div>

          {profile.targetRoles?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm text-secondary font-semibold mb-2">Roles objetivo</div>
              <div className="flex flex-wrap gap-1">
                {profile.targetRoles.map((r: string) => (
                  <span key={r} className="skill-tag">{r}</span>
                ))}
              </div>
            </div>
          )}

          {profile.preferredLocations?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="text-sm text-secondary font-semibold mb-2">Ubicaciones</div>
              <div className="flex flex-wrap gap-1">
                {profile.preferredLocations.map((l: string) => (
                  <span key={l} className="skill-tag">{l}</span>
                ))}
              </div>
            </div>
          )}

          {profile.avoidKeywords?.length > 0 && (
            <div>
              <div className="text-sm text-secondary font-semibold mb-2">Evitar</div>
              <div className="flex flex-wrap gap-1">
                {profile.avoidKeywords.map((k: string) => (
                  <span key={k} style={{ background: 'var(--danger-light)', color: '#dc2626' }} className="skill-tag">{k}</span>
                ))}
              </div>
            </div>
          )}

          {profile.education && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div className="text-sm text-secondary font-semibold mb-2">Educación</div>
              <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{profile.education}</p>
            </div>
          )}

          {profile.searchMode && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
                {profile.searchMode === 'busqueda_activa' ? 'Búsqueda Activa' : 'Carrera Ideal'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Skills card */}
      <div className="card">
        <div className="card-header">Habilidades ({profile.skills?.length ?? 0})</div>
        <div style={{ padding: 20 }}>
          {(profile.skills ?? []).map((s: { name: string; rating: number }) => {
            const pct = (s.rating / 10) * 100;
            const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={s.name} style={{ marginBottom: 12 }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                  <span className="text-xs text-secondary">{s.rating}/10</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
          {(!profile.skills || profile.skills.length === 0) && (
            <p className="text-sm text-secondary">No hay habilidades registradas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
