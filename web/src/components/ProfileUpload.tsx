import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

interface ProfilePreview {
  name: string;
  seniority: string;
  skills: { name: string; rating: number }[];
  experience: number;
  targetRoles: string[];
  education?: string;
  preferredLocations: string[];
  avoidKeywords: string[];
}

export default function ProfileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProfilePreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleUpload = async (f: File) => {
    if (!f.name.endsWith('.pdf')) { setError('Solo archivos PDF'); return; }
    setFile(f);
    setError('');
    setUploading(true);
    const form = new FormData();
    form.append('cv', f);
    try {
      const res = await axios.post('/api/profile/upload', form);
      setPreview(res.data.preview);
      setFilePath(res.data.filePath);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al procesar el CV');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await axios.post('/api/profile/save', { ...preview, cvPath: filePath });
      navigate('/profile');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Link to="/profile" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16, color: 'var(--text-secondary)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver al perfil
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Subir CV</h1>

      {!preview && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              padding: 56,
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'var(--primary-light)' : 'var(--surface)',
              border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
              transition: 'all .2s',
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={dragOver ? 'var(--primary)' : 'var(--text-secondary)'} strokeWidth="1.5" style={{ marginBottom: 12 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <p style={{ fontSize: 15, fontWeight: 600, color: dragOver ? 'var(--primary)' : 'var(--text)' }}>
              {dragOver ? 'Suelta tu CV aquí' : 'Arrastra tu CV o haz clic'}
            </p>
            <p className="text-xs text-secondary" style={{ marginTop: 4 }}>PDF, máximo 10 MB</p>
            {uploading && <p style={{ color: 'var(--primary)', marginTop: 12, fontSize: 13 }}>Procesando CV…</p>}
          </div>
        </div>
      )}

      {error && <div className="card" style={{ padding: '10px 16px', marginTop: 12, background: 'var(--danger-light)', borderColor: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      {preview && (
        <div>
          <div className="card mb-4">
            <div className="card-header">Vista previa</div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{preview.name}</div>
                <div className="text-sm text-secondary">{preview.seniority} · {preview.experience} años exp.</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div className="text-sm text-secondary font-semibold mb-2">Habilidades ({preview.skills.length})</div>
                <div className="flex flex-wrap gap-1">
                  {preview.skills.map(s => (
                    <span key={s.name} className="skill-tag">{s.name} ({s.rating}/10)</span>
                  ))}
                </div>
              </div>

              {preview.education && (
                <div style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="text-sm text-secondary font-semibold mb-2">Educación</div>
                  <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{preview.education}</p>
                </div>
              )}

              {preview.targetRoles.length > 0 && (
                <div style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="text-sm text-secondary font-semibold mb-2">Roles objetivo</div>
                  <div className="flex flex-wrap gap-1">
                    {preview.targetRoles.map(r => <span key={r} className="skill-tag">{r}</span>)}
                  </div>
                </div>
              )}

              {preview.avoidKeywords.length > 0 && (
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div className="text-sm text-secondary font-semibold mb-2">Evitar</div>
                  <div className="flex flex-wrap gap-1">
                    {preview.avoidKeywords.map(k => (
                      <span key={k} style={{ background: 'var(--danger-light)', color: '#dc2626' }} className="skill-tag">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar Perfil'}
            </button>
            <button className="btn" onClick={() => { setPreview(null); setFile(null); }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
