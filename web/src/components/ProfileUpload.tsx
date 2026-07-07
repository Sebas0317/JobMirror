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
      await axios.post('/api/profile/save', {
        ...preview,
        cvPath: filePath,
      });
      navigate('/profile');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← Dashboard</Link>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>Subir CV</h2>

      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{
            marginTop: 16,
            border: `2px dashed ${dragOver ? '#2563eb' : '#d1d5db'}`,
            borderRadius: 12,
            padding: 48,
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
          <p style={{ fontWeight: 600 }}>Arrastra tu CV aquí o haz clic para seleccionar</p>
          <p style={{ fontSize: 13, color: '#666' }}>PDF solamente, máximo 10MB</p>
          {uploading && <p style={{ color: '#2563eb', marginTop: 8 }}>Procesando CV…</p>}
        </div>
      )}

      {error && <p style={{ color: '#ef4444', marginTop: 12 }}>{error}</p>}

      {preview && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Vista previa</h3>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16 }}>
            <p><strong>Nombre:</strong> {preview.name}</p>
            <p><strong>Seniority:</strong> {preview.seniority}</p>
            <p><strong>Experiencia:</strong> {preview.experience} años</p>
            <p><strong>Skills:</strong> {preview.skills.length} detectados</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {preview.skills.map(s => (
                <span key={s.name} style={{ padding: '2px 8px', background: '#dbeafe', borderRadius: 10, fontSize: 12 }}>
                  {s.name} ({s.rating}/10)
                </span>
              ))}
            </div>
            {preview.education && (
              <p style={{ marginTop: 8 }}><strong>Educación:</strong><br />{preview.education}</p>
            )}
            <p style={{ marginTop: 8 }}><strong>Roles objetivo:</strong> {preview.targetRoles.join(', ')}</p>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '8px 24px', background: '#2563eb', color: 'white', border: 'none',
              borderRadius: 6, fontWeight: 600, cursor: 'pointer',
            }}>
              {saving ? 'Guardando…' : 'Guardar Perfil'}
            </button>
            <button onClick={() => { setPreview(null); setFile(null); }} style={{
              padding: '8px 24px', background: '#e5e7eb', border: 'none',
              borderRadius: 6, fontWeight: 600, cursor: 'pointer',
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
