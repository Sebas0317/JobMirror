import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import type { Vacancy } from '../models/Vacancy';
import { classifyMatch, timeAgo, type MatchType } from '../models/types';

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

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

  async function triggerScan() {
    setScanning(true);
    try {
      await axios.post('/api/scan');
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    fetchData();
    pollingRef.current = setInterval(fetchData, 30000);
    return () => clearInterval(pollingRef.current);
  }, []);

  const sources = ['todas', ...new Set(vacancies.map(v => v.source).filter(Boolean))];
  const targetRoles: string[] = profile?.targetRoles ?? ['Data Analyst'];

  const toggleType = (t: MatchType) => {
    setTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
    setCurrentPage(1);
  };

  let filtered = sourceFilter === 'todas'
    ? vacancies
    : vacancies.filter(v => v.source === sourceFilter);

  // Apply matchType filter
  filtered = filtered.filter(v => typeFilter.has(classifyMatch(v.title, v.description, targetRoles)));

  const sorted = viewMode === 'latest'
    ? [...filtered].sort((a, b) => {
        const aTime = new Date(a.publishedAt ?? '').getTime() || -(a.id ?? 0);
        const bTime = new Date(b.publishedAt ?? '').getTime() || -(b.id ?? 0);
        return bTime - aTime;
      })
    : [...filtered].sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortAsc ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortAsc ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });

  const startIdx = (currentPage - 1) * pageSize;
  const paginated = sorted.slice(startIdx, startIdx + pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize) || 1;

  const handleSort = (key: keyof Vacancy) => {
    if (viewMode !== 'matches') setViewMode('matches');
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setCurrentPage(1);
  };

  const switchView = (mode: 'matches' | 'latest') => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  if (loading) return <div className="p-4">Cargando vacantes…</div>;

  const typeColors: Record<string, string> = {
    directa: '#22c55e',
    transferible: '#06b6d4',
    baja_relacion: '#9ca3af',
  };

  return (
    <div className="p-4" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          Job Monitor {profile?.name ? `— ${profile.name}` : ''}
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>
            {profile?.searchMode === 'carrera_ideal' ? '🎯 Carrera Ideal' : '🔍 Búsqueda Activa'}
          </span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {lastUpdate && `⏱ ${lastUpdate}`}
          </span>
          <button
            onClick={() => { setRefreshing(true); fetchData(); }}
            disabled={refreshing}
            style={{
              padding: '4px 10px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              background: refreshing ? '#f3f4f6' : '#fff',
              cursor: refreshing ? 'default' : 'pointer',
              fontSize: 12,
              color: '#333',
            }}
          >
            {refreshing ? '⋯' : '↻'}
          </button>
          <button
            onClick={triggerScan}
            disabled={scanning}
            style={{
              padding: '4px 10px',
              border: '1px solid #3b82f6',
              borderRadius: 4,
              background: scanning ? '#dbeafe' : '#3b82f6',
              cursor: scanning ? 'default' : 'pointer',
              fontSize: 12,
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {scanning ? 'Escaneando…' : 'Escanear'}
          </button>
          <Link to="/profile" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 14 }}>Perfil</Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d1d5db' }}>
          <button onClick={() => switchView('matches')} style={{
            padding: '6px 14px', border: 'none', cursor: 'pointer',
            background: viewMode === 'matches' ? '#3b82f6' : '#fff',
            color: viewMode === 'matches' ? '#fff' : '#333',
            fontWeight: 600, fontSize: 13,
          }}>Top Matches</button>
          <button onClick={() => switchView('latest')} style={{
            padding: '6px 14px', border: 'none', cursor: 'pointer',
            background: viewMode === 'latest' ? '#3b82f6' : '#fff',
            color: viewMode === 'latest' ? '#fff' : '#333',
            fontWeight: 600, fontSize: 13,
          }}>Latest</button>
        </div>

        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setCurrentPage(1); }}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
          {sources.map(s => (
            <option key={s} value={s}>{s === 'todas' ? 'Todas las fuentes' : s}</option>
          ))}
        </select>

        {/* MatchType filter */}
        {(['directa', 'transferible', 'baja_relacion'] as MatchType[]).map(t => (
          <label key={t} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={typeFilter.has(t)} onChange={() => toggleType(t)} />
            <span style={{ color: typeColors[t], fontWeight: 600 }}>
              {t === 'directa' ? 'Directa' : t === 'transferible' ? 'Transferible' : 'Baja'}
            </span>
          </label>
        ))}

        <span style={{ fontSize: 13, color: '#666' }}>
          {sorted.length} vacantes
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {[
                { key: 'publishedAt' as keyof Vacancy, label: 'Fecha' },
                { key: 'title' as keyof Vacancy, label: 'Vacante' },
                { key: 'company' as keyof Vacancy, label: 'Empresa' },
                { key: 'source' as keyof Vacancy, label: 'Fuente' },
                { key: 'score' as keyof Vacancy, label: 'Score' },
              ].map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{
                  padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
                  borderBottom: '2px solid #e5e7eb', userSelect: 'none',
                }}>
                  {col.label} {viewMode === 'matches' && sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
              <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Tipo</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((v) => {
              const mtype = classifyMatch(v.title, v.description, targetRoles);
              return (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#666', fontSize: 13 }}>
                    {timeAgo(v.publishedAt ?? v.createdAt)}
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 500 }}>{v.title}</td>
                  <td style={{ padding: '8px 10px', color: '#666' }}>{v.company || '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 13 }}>{v.source}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: scoreColor(v.score ?? 0) }}>
                    {v.score?.toFixed(0) ?? '—'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                      fontSize: 11, fontWeight: 600, color: '#fff',
                      backgroundColor: typeColors[mtype],
                    }}>
                      {mtype === 'directa' ? 'Directa' : mtype === 'transferible' ? 'Transferible' : 'Baja'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <Link to={`/vacancy/${v.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#fff', cursor: currentPage === 1 ? 'default' : 'pointer',
          opacity: currentPage === 1 ? 0.5 : 1,
        }}>← Anterior</button>
        <span style={{ fontSize: 13, color: '#666' }}>Página {currentPage} de {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid #d1d5db',
          background: '#fff', cursor: currentPage === totalPages ? 'default' : 'pointer',
          opacity: currentPage === totalPages ? 0.5 : 1,
        }}>Siguiente →</button>
      </div>
    </div>
  );
}
