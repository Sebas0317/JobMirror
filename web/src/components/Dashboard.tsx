import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { Vacancy } from '../models/Vacancy';
import { classifyMatch, timeAgo, type MatchType } from '../models/types';

const MATCH_LABELS: Record<MatchType, string> = { directa: 'Directa', transferible: 'Transferible', baja_relacion: 'Baja' };
const MATCH_CLASSES: Record<MatchType, string> = { directa: 'badge-directa', transferible: 'badge-transferible', baja_relacion: 'badge-baja' };

export default function Dashboard() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Vacancy>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('todas');
  const [viewMode, setViewMode] = useState<'matches' | 'latest'>('latest');
  const [profile, setProfile] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<Set<MatchType>>(new Set(['directa', 'transferible', 'baja_relacion']));
  const [scanStatus, setScanStatus] = useState<string>('');

  const pageSize = 15;
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  async function fetchData() {
    try {
      const [vacRes, profileRes] = await Promise.all([
        axios.get<Vacancy[]>('/api/vacancies'),
        axios.get('/api/profile'),
      ]);
      setVacancies(vacRes.data);
      setProfile(profileRes.data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function doScan() {
    if (scanning) return;
    setScanning(true);
    setScanStatus('Escaneando...');
    try {
      const { data } = await axios.post('/api/scan');
      if (data.status === 'ok') {
        setScanStatus(`Completado: ${data.result.total} vacantes`);
      } else {
        setScanStatus(data.status);
      }
      await fetchData();
    } catch {
      setScanStatus('Error en scan');
    } finally {
      setScanning(false);
      setTimeout(() => setScanStatus(''), 4000);
    }
  }

  useEffect(() => {
    fetchData();
    pollingRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(pollingRef.current);
  }, []);

  // Filter by source first
  let sourceFiltered = vacancies;
  if (sourceFilter !== 'todas') {
    sourceFiltered = vacancies.filter(v => v.source === sourceFilter);
  }

  let filtered: Vacancy[];
  if (viewMode === 'matches') {
    // Apply type filter and sorting by sortKey/sortAsc
    const withType = sourceFiltered.filter(v => {
      const mtype = classifyMatch(v.title, v.description, profile?.targetRoles ?? []);
      return typeFilter.has(mtype);
    });
    filtered = [...withType].sort((a, b) => {
      const aV = a[sortKey] ?? '';
      const bV = b[sortKey] ?? '';
      const cmp = typeof aV === 'string' ? aV.localeCompare(bV as string) : (aV as number) - (bV as number);
      return sortAsc ? cmp : -cmp;
    });
  } else {
    // "latest" view: ignore type filter, sort by publishedAt descending, then createdAt descending
    filtered = [...sourceFiltered].sort((a, b) => {
      const aPub = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bPub = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      if (aPub !== bPub) return bPub - aPub; // descending by published
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated; // descending by created
    });
  }

  const sources = Array.from(new Set(vacancies.map(v => v.source)));
  const totalPages = Math.ceil(filtered.length / pageSize);
  const page = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: keyof Vacancy) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }
  function sortArrow(key: keyof Vacancy) {
    if (sortKey !== key) return '';
    return sortAsc ? ' ▲' : ' ▼';
  }
  function toggleType(t: MatchType) {
    const next = new Set(typeFilter);
    if (next.has(t)) next.delete(t); else next.add(t);
    setTypeFilter(next);
    setCurrentPage(1);
  }

  function scoreClass(s: number | null | undefined) {
    if (s == null) return '';
    if (s >= 70) return 'score-high';
    if (s >= 50) return 'score-mid';
    return 'score-low';
  }

  if (loading) {
    return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3">
          <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Vacantes</h1>
          {lastUpdate && <span className="text-sm text-secondary">· {lastUpdate}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
            {refreshing ? '...' : 'Actualizar'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={doScan} disabled={scanning}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            {scanning ? 'Escaneando...' : 'Escanear'}
          </button>
        </div>
      </div>

      {scanStatus && (
        <div className="card mb-4" style={{ padding: '10px 16px', fontSize: 13, background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
          {scanStatus}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <span className="text-sm text-secondary font-medium">Match:</span>
          <div className="pill-group">
            {(['directa', 'transferible', 'baja_relacion'] as MatchType[]).map(t => (
              <span key={t} className={`pill ${typeFilter.has(t) ? 'active' : ''}`} onClick={() => toggleType(t)}>
                {MATCH_LABELS[t]}
              </span>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span className="text-sm text-secondary font-medium">Fuente:</span>
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }}
            style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, background: 'var(--surface)' }}>
            <option value="todas">Todas</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span className="text-sm text-secondary font-medium">Vista:</span>
          <div className="pill-group">
            <span className={`pill ${viewMode === 'matches' ? 'active' : ''}`} onClick={() => { setViewMode('matches'); setCurrentPage(1); }}>Matches</span>
            <span className={`pill ${viewMode === 'latest' ? 'active' : ''}`} onClick={() => { setViewMode('latest'); setCurrentPage(1); }}>Últimas</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th onClick={() => toggleSort('score')}>Score{sortArrow('score')}</th>
                <th onClick={() => toggleSort('title')}>Título{sortArrow('title')}</th>
                <th onClick={() => toggleSort('company')}>Empresa{sortArrow('company')}</th>
                <th onClick={() => toggleSort('source')}>Fuente{sortArrow('source')}</th>
                <th onClick={() => toggleSort('publishedAt')}>Fecha{sortArrow('publishedAt')}</th>
              </tr>
            </thead>
            <tbody>
              {page.map(v => {
                const mtype = classifyMatch(v.title, v.description, profile?.targetRoles ?? []);
                const badgeClass = MATCH_CLASSES[mtype];
                return (
                  <tr key={v.id}>
                    <td>
                      <span className={`badge badge-score font-bold ${scoreClass(v.score)}`}
                        style={{ background: v.score != null && v.score >= 70 ? 'var(--success-light)' : v.score != null && v.score >= 50 ? 'var(--warning-light)' : 'var(--danger-light)' }}>
                        {v.score != null ? v.score : '—'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/vacancy/${v.id}`} style={{ fontWeight: 500, color: 'var(--text)' }}>
                        <span className="truncate" style={{ maxWidth: 300, display: 'inline-block' }}>{v.title}</span>
                      </Link>
                      <div style={{ marginTop: 2 }}>
                        <span className={`badge ${badgeClass}`}>{MATCH_LABELS[mtype]}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{v.company}</td>
                    <td><span className="badge" style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }}>{v.source}</span></td>
                    <td className="text-sm text-secondary" style={{ whiteSpace: 'nowrap' }}>{timeAgo(v.publishedAt ?? v.createdAt)}</td>
                  </tr>
                );
              })}
              {page.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {vacancies.length === 0 ? 'No hay vacantes. Escanea para obtener resultados.' : 'Ninguna vacante coincide con los filtros.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>← Anterior</button>
            <span className="text-sm text-secondary">Página {currentPage} de {totalPages}</span>
            <button className="btn btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  );
}
