'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import UserTable from '@/components/admin/UserTable';
import StatsCard from '@/components/admin/StatsCard';
import { User, Code, Trophy } from '@/components/icons';
import toast from 'react-hot-toast';

interface SectionData {
  section: string;
  stats: {
    totalStudents: number;
    totalProblems: number;
    avgProblems: string;
    topPerformer: any;
  };
  students: any[];
}

export default function SectionsPage() {
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [sectionData, setSectionData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSection) {
      fetchSectionData(selectedSection);
    }
  }, [selectedSection]);

  const fetchSections = async () => {
    try {
      const { data } = await api.get('/admin/users');
      const uniqueSections = Array.from(
        new Set(data.users.map((u: any) => u.section).filter(Boolean))
      ) as string[];
      setSections(uniqueSections.sort());
      if (uniqueSections.length > 0) {
        setSelectedSection(uniqueSections[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch sections:', err);
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionData = async (section: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/section/${section}`);
      setSectionData(data);
    } catch (err: any) {
      console.error('Failed to fetch section data:', err);
      toast.error('Failed to load section data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Section View</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>View students and statistics by section</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Section Selector */}
      <div>
        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select Section</label>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border rounded-lg transition-colors form-input"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {sections.map((section) => (
            <option key={section} value={section}>
              Section {section}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading section data...</p>
        </div>
      ) : sectionData ? (
        <>
          {/* Section Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            <StatsCard
              title="Total Students"
              value={sectionData.stats.totalStudents}
              icon={<User size={24} />}
              subtitle={`In Section ${sectionData.section}`}
            />
            <StatsCard
              title="Total Problems"
              value={sectionData.stats.totalProblems}
              icon={<Code size={24} />}
              subtitle="Solved by all students"
            />
            <StatsCard
              title="Average Problems"
              value={parseFloat(sectionData.stats.avgProblems).toFixed(1)}
              icon={<Trophy size={24} />}
              subtitle="Per student"
            />
          </div>

          {/* Top Performer */}
          {sectionData.stats.topPerformer && (
            <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="bg-grad-orange px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Section MVP</span>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-2xl" 
                         style={{ background: 'var(--grad-orange)', border: '4px solid rgba(255,255,255,0.1)' }}>
                      {sectionData.stats.topPerformer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white text-orange-600 rounded-lg p-1.5 shadow-xl border border-orange-100">
                        <Trophy size={16} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-white">{sectionData.stats.topPerformer.name}</h2>
                        <span className="badge badge-warning text-[10px]">SECTION RANK #1</span>
                    </div>
                    <p className="text-muted font-medium mb-3">{sectionData.stats.topPerformer.email}</p>
                    <div className="flex items-center gap-2">
                        <span className="badge badge-info">Section {sectionData.section}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center min-w-[140px] backdrop-blur-md">
                    <p className="text-3xl font-black text-orange-500 mb-1">
                      {sectionData.stats.topPerformer.total_problems}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Problems Solved</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students Table */}
          <div className="glass-card p-4 md:p-6" style={{ border: '1px solid var(--border)' }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <span className="section-title-bar" />
              All Students in Section {sectionData.section}
            </h2>
            <UserTable users={sectionData.students} />
          </div>
        </>
      ) : (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          No data available for this section
        </div>
      )}
      </div>
    </div>
  );
}
