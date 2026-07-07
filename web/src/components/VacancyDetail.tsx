import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import type { Vacancy } from '../models/Vacancy';
import { classifyMatch, getCareerPath, timeAgo } from '../models/types';

interface Feedback {
  id: number;
  vacancyId: number;
  status: string;
  notes?: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function badge(text: string, color: string): React.ReactElement {
  return React.createElement('span', {
    style: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      color: '#fff',
      backgroundColor: color,
    },
  }, text);
}

export default function VacancyDetail() {
  const { id } = useParams<{ id: string }>();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [vacRes, profileRes] = await Promise.all([
          axios.get<any>(`/api/vacancies/${id}`),
          axios.get('/api/profile'),
        ]);
        setVacancy(vacRes.data);
        setProfile(profileRes.data);
        if (vacRes.data.feedbacks?.length) {
          setFeedback(vacRes.data.feedbacks[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await axios.patch(`/api/feedback/${id}`, { status: newStatus });
      setFeedback(res.data);
      setStatusMsg(`✓ ${newStatus}`);
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-4">Cargando…</div>;
  if (!vacancy) return <div className="p-4">Vacante no encontrada.</div>;

  const targetRoles: string[] = profile?.targetRoles ?? ['Data Analyst'];
  const mtype = classifyMatch(vacancy.title, vacancy.description, targetRoles);
  const careerPath = getCareerPath(targetRoles, mtype);

  let skillList: string[] = [];
  if (vacancy.skillsExtracted) {
    try { skillList = JSON.parse(vacancy.skillsExtracted); } catch { skillList = []; }
  }

  const recColor = (vacancy.score ?? 0) >= 75 ? '#22c55e' :
    (vacancy.score ?? 0) >= 55 ? '#f59e0b' :
    (vacancy.score ?? 0) >= 35 ? '#6b7280' : '#ef4444';

  const recLabel = (vacancy.score ?? 0) >= 75 ? 'APLICAR' :
    (vacancy.score ?? 0) >= 55 ? 'PREPARAR' :
    (vacancy.score ?? 0) >= 35 ? 'REVISAR' : 'IGNORAR';

  const typeColors: Record<string, string> = {
    directa: '#22c55e',
    transferible: '#06b6d4',
    baja_relacion: '#9ca3af',
  };

  return (
    <div className="p-4" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>← Volver</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginTop: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{vacancy.title}</h2>
          <p style={{ color: '#666', marginTop: 4 }}>
            {vacancy.company} · {vacancy.source} · {vacancy.location ?? '—'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {badge(mtype === 'directa' ? 'Directa' : mtype === 'transferible' ? 'Transferible' : 'Baja rel.', typeColors[mtype])}
          {badge(recLabel, recColor)}
        </div>
      </div>

      {vacancy.publishedAt && (
        <p style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
          Publicado: {timeAgo(vacancy.publishedAt ?? vacancy.createdAt)}
        </p>
      )}

      {/* Score Breakdown */}
      <div style={{
        background: '#f5f5f5',
        borderRadius: 8,
        padding: 16,
        marginTop: 16,
        display: 'flex',
        gap: 32,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor(vacancy.score ?? 0) }}>
            {vacancy.score?.toFixed(0) ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>Score</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{vacancy.compatibility?.toFixed(0) ?? '—'}%</div>
          <div style={{ fontSize: 12, color: '#999' }}>Skills Match</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{vacancy.growth ?? '—'}/100</div>
          <div style={{ fontSize: 12, color: '#999' }}>Crecimiento</div>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{vacancy.strategic ?? '—'}/100</div>
          <div style={{ fontSize: 12, color: '#999' }}>Valor Estrat.</div>
        </div>
      </div>

      {/* Career Path */}
      <div style={{ marginTop: 16, padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
        <strong>Camino de carrera:</strong>{' '}
        {careerPath.map((role, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: '#06b6d4', margin: '0 4px' }}>→</span>}
            <span style={{ color: i === careerPath.length - 1 ? '#16a34a' : '#333', fontWeight: i === careerPath.length - 1 ? 600 : 400 }}>
              {role}
            </span>
          </span>
        ))}
      </div>

      {/* Description */}
      <section style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Descripción</h3>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#444' }}>
          {vacancy.description}
        </div>
      </section>

      {vacancy.requirements && (
        <section style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Requisitos</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#444' }}>
            {vacancy.requirements}
          </div>
        </section>
      )}

      {/* Skills */}
      <section style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Skills Detectados</h3>
        {skillList.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {skillList.map((s, i) => {
              const matched = profile?.skills?.some((ps: any) => ps.name.toLowerCase() === s.toLowerCase());
              return React.createElement('span', {
                key: i,
                style: {
                  padding: '4px 10px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: matched ? '#dcfce7' : '#fef3c7',
                  color: matched ? '#166534' : '#92400e',
                  border: matched ? '1px solid #86efac' : '1px solid #fcd34d',
                },
              }, s + (matched ? ' ✓' : ' ⚠'));
            })}
          </div>
        ) : (
          <p style={{ color: '#999' }}>—</p>
        )}
      </section>

      {/* Feedback */}
      <section style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Feedback</h3>
        <p style={{ marginBottom: 8, color: '#666' }}>
          Estado actual: <strong>{feedback?.status ?? 'PENDING'}</strong>
          {statusMsg && <span style={{ color: '#22c55e', marginLeft: 8 }}>{statusMsg}</span>}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Me interesa', status: 'INTERESTED', color: '#22c55e' },
            { label: 'Descartar', status: 'DISCARDED', color: '#f97316' },
            { label: 'Aplicado', status: 'APPLIED', color: '#3b82f6' },
          ].map(btn => (
            <button
              key={btn.status}
              onClick={() => updateStatus(btn.status)}
              style={{
                padding: '8px 16px',
                background: btn.color,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                opacity: feedback?.status === btn.status ? 0.6 : 1,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
