'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import FilterBar from '@/components/admin/FilterBar';
import toast from 'react-hot-toast';

interface LeaderboardEntry {
  id: number;
  name: string;
  email: string;
  registration_no?: string;
  course?: string;
  section?: string;
  total_problems: number;
  total_score: number;
  avg_rating: number;
  verified_profiles: number;
  rank: number;
}

export default function AdminLeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [metric, setMetric] = useState<'score' | 'problems' | 'rating'>('score');
  const [courses, setCourses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCourse, selectedSection, metric]);

  const fetchFilters = async () => {
    try {
      const { data } = await api.get('/admin/users');
      const uniqueCourses = Array.from(
        new Set(data.users.map((u: any) => u.course).filter(Boolean))
      ) as string[];
      const uniqueSections = Array.from(
        new Set(data.users.map((u: any) => u.section).filter(Boolean))
      ) as string[];
      setCourses(uniqueCourses.sort());
      setSections(uniqueSections.sort());
    } catch (err: any) {
      console.error('Failed to fetch filters:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params: any = { metric, limit: 100 };
      if (selectedCourse) params.course = selectedCourse;
      if (selectedSection) params.section = selectedSection;

      const { data } = await api.get('/admin/leaderboard', { params });
      setLeaderboard(data.leaderboard);
    } catch (err: any) {
      console.error('Failed to fetch leaderboard:', err);
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedCourse('');
    setSelectedSection('');
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getMetricValue = (entry: LeaderboardEntry) => {
    if (metric === 'problems') return entry.total_problems;
    if (metric === 'rating') return parseFloat(entry.avg_rating.toString()).toFixed(0);
    return parseFloat(entry.total_score.toString()).toFixed(0);
  };

  const getMetricLabel = () => {
    if (metric === 'problems') return 'Problems Solved';
    if (metric === 'rating') return 'Avg Rating';
    return 'Total Score';
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Admin Leaderboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>View and filter student rankings</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="w-full px-4 py-2 border rounded-lg transition-colors form-input"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="score">Total Score</option>
              <option value="problems">Problems Solved</option>
              <option value="rating">Average Rating</option>
            </select>
          </div>
        </div>
        <FilterBar
          courses={courses}
          sections={sections}
          selectedCourse={selectedCourse}
          selectedSection={selectedSection}
          onCourseChange={setSelectedCourse}
          onSectionChange={setSelectedSection}
          onReset={handleReset}
        />
      </div>

      {/* Leaderboard */}
      <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading leaderboard...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 md:p-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <span className="section-title-bar" />
                Rankings
              </h2>
              <p className="text-sm md:text-base" style={{ color: 'var(--text-muted)' }}>{leaderboard.length} students</p>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-24">Rank</th>
                    <th>Student</th>
                    <th className="hidden sm:table-cell">Reg No</th>
                    <th className="hidden md:table-cell">Course</th>
                    <th className="hidden md:table-cell text-center">Profiles</th>
                    <th className="text-right">{getMetricLabel()}</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => {
                    const medal = getMedalEmoji(entry.rank);
                    return (
                      <tr
                        key={entry.id}
                        className={entry.rank <= 3 ? 'bg-surface/10' : ''}
                      >
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex justify-center">
                              {medal ? (
                                <span className="text-2xl drop-shadow-glow">{medal}</span>
                              ) : (
                                <span className="text-muted font-bold text-sm">#{entry.rank}</span>
                              )}
                            </div>
                            {entry.rank <= 3 && (
                                <span className="badge badge-warning py-0.5 px-2 text-[10px]">TOP {entry.rank}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-grad-brand flex items-center justify-center text-white font-bold shadow-lg">
                                    {entry.name.charAt(0).toUpperCase()}
                                </div>
                                {entry.rank === 1 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-bg-primary flex items-center justify-center">
                                        <span className="text-[8px]">👑</span>
                                    </div>
                                )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-base">{entry.name}</div>
                              <div className="text-xs text-muted font-medium">{entry.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell font-mono text-xs opacity-70">
                          {entry.registration_no || '-'}
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="badge badge-info">{entry.course || '-'}</span>
                        </td>
                        <td className="hidden md:table-cell text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-xs border border-blue-500/20">
                            {entry.verified_profiles}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-white">
                              {getMetricValue(entry)}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-muted font-bold">
                              {metric}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {leaderboard.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  No students found
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
