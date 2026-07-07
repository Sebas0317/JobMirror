import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { classifyMatch, getCareerPath, timeAgo } from '../models/types';
import type { MatchType } from '../models/types';

interface VacancyDetailData {
  id: number; title: string; company: string; location?: string | null;
  description: string; requirements?: string | null; url: string;
  source: string; salary?: string | null; contractType?: string | null;
  experienceRequired?: string | null; publishedAt?: string | null;
  skillsExtracted?: string[] | string | null; score?: number | null;
  compatibility?: number | null; growth?: number | null; strategic?: number | null;
  feedbacks?: { id: number; status: string; notes: string | null }[];
}

export default function VacancyDetail() {
  const { id } = useParams<{ id: string }>();
  const [vacancy, setVacancy] = useState<VacancyDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<string>('PENDING');
  const [feedbackNotes, setFeedbackNotes] = useState('');

  useEffect(() => {
    Promise.all([
      axios.get<VacancyDetailData>(`/api/vacancies/${id}`),
      axios.get('/api/profile'),
    ]).then(([v, p]) => {
      setVacancy(v.data);
      setProfile(p.data);
      if (v.data.feedbacks?.[0]) {
        setFeedbackStatus(v.data.feedbacks[0].status);
        setFeedbackNotes(v.data.feedbacks[0].notes ?? '');
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  async function saveFeedback(status: string) {
    try {
      await axios.patch(`/api/feedback/${id}`, { status, notes: feedbackNotes });
      setFeedbackStatus(status);
    } catch (e) { console.error(e); }
  }

  if (loading) {
    return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>;
  }
  if (!vacancy) {
    return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Vacante no encontrada.</div>;
  }

  const targetRoles = profile?.targetRoles ?? [];
  const mtype: MatchType = classifyMatch(vacancy.title, vacancy.description, targetRoles);
  const careerPath = getCareerPath(targetRoles, mtype);

  const skills: string[] = Array.isArray(vacancy.skillsExtracted)
    ? vacancy.skillsExtracted
    : typeof vacancy.skillsExtracted === 'string'
      ? JSON.parse(vacancy.skillsExtracted) : [];

  return (
    <div>
      <Link to="/" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Volver
      </Link>

      <div className="grid-2">
        {/* Main info */}
        <div className="card">
          <div className="card-header">
            <span className="truncate" style={{ maxWidth: 400 }}>{vacancy.title}</span>
            <div className={`badge ${mtype === 'directa' ? 'badge-directa' : mtype === 'transferible' ? 'badge-transferible' : 'badge-baja'}`}>
              {mtype === 'directa' ? 'Directa' : mtype === 'transferible' ? 'Transferible' : 'Baja'}
            </div>
          </div>
          <div style={{ padding: 20 }}>
            <div className="grid-2" style={{ marginBottom: 16, gap: 12 }}>
              {vacancy.company && (
                <div><span className="text-xs text-secondary">EMPRESA</span><p style={{ fontSize: 14, fontWeight: 600 }}>{vacancy.company}</p></div>
              )}
              {vacancy.source && (
                <div><span className="text-xs text-secondary">FUENTE</span><p style={{ fontSize: 14, fontWeight: 600 }}>{vacancy.source}</p></div>
              )}
              {vacancy.location && (
                <div><span className="text-xs text-secondary">UBICACIÓN</span><p style={{ fontSize: 14 }}>{vacancy.location}</p></div>
              )}
              {vacancy.salary && (
                <div><span className="text-xs text-secondary">SALARIO</span><p style={{ fontSize: 14 }}>{vacancy.salary}</p></div>
              )}
              {vacancy.contractType && (
                <div><span className="text-xs text-secondary">CONTRATO</span><p style={{ fontSize: 14 }}>{vacancy.contractType}</p></div>
              )}
              {vacancy.experienceRequired && (
                <div><span className="text-xs text-secondary">EXPERIENCIA</span><p style={{ fontSize: 14 }}>{vacancy.experienceRequired}</p></div>
              )}
              {vacancy.publishedAt && (
                <div><span className="text-xs text-secondary">PUBLICADO</span><p style={{ fontSize: 14 }}>{timeAgo(vacancy.publishedAt)}</p></div>
              )}
            </div>

            {vacancy.description && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="text-sm text-secondary font-semibold mb-2">Descripción</div>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{vacancy.description}</p>
              </div>
            )}

            {vacancy.requirements && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div className="text-sm text-secondary font-semibold mb-2">Requisitos</div>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{vacancy.requirements}</p>
              </div>
            )}

            {vacancy.url && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <a href={vacancy.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Ver original
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Score */}
          <div className="card mb-4">
            <div className="card-header">Puntuación</div>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, marginBottom: 4,
                color: (vacancy.score ?? 0) >= 70 ? 'var(--success)' : (vacancy.score ?? 0) >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                {vacancy.score ?? '—'}
              </div>
              <div className="text-sm text-secondary mb-4">/ 100</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
                {[
                  { label: 'Compatibilidad', value: vacancy.compatibility, color: 'var(--primary)' },
                  { label: 'Crecimiento', value: vacancy.growth, color: 'var(--accent)' },
                  { label: 'Estratégico', value: vacancy.strategic, color: '#14b8a6' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-secondary">{item.label}</span>
                      <span className="text-xs font-semibold">{item.value ?? 0}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${item.value ?? 0}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Career path */}
          {careerPath.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">Carrera</div>
              <div style={{ padding: 16 }}>
                {careerPath.map((step, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ marginBottom: i < careerPath.length - 1 ? 8 : 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : 'var(--border)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="card mb-4">
              <div className="card-header">Skills ({skills.length})</div>
              <div style={{ padding: 16 }}>
                <div className="flex flex-wrap gap-1">
                  {skills.map(s => <span key={s} className="skill-tag">{s}</span>)}
                </div>
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="card">
            <div className="card-header">Feedback</div>
            <div style={{ padding: 16 }}>
              <div className="flex flex-wrap gap-2 mb-2">
                {['INTERESTED', 'APPLIED', 'DISCARDED', 'PENDING'].map(st => (
                  <button key={st} className={`btn btn-sm ${feedbackStatus === st ? 'btn-primary' : ''}`}
                    onClick={() => saveFeedback(st)}>
                    {st === 'INTERESTED' ? '📌 Interesado' : st === 'APPLIED' ? '✅ Aplicado' : st === 'DISCARDED' ? '❌ Descartado' : '⏳ Pendiente'}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Notas..."
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                onBlur={() => saveFeedback(feedbackStatus)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, resize: 'vertical', minHeight: 60, fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
