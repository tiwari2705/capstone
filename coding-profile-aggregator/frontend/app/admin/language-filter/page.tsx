'use client';

import { useState, useEffect } from 'react';
import { Download } from '@/components/icons';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Student {
  id: number;
  name: string;
  registration_no: string;
  course: string;
  section: string;
  email: string;
  year_of_passing?: number | null;
  languages: { [key: string]: number };
}

export default function LanguageFilterPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [minQuestions, setMinQuestions] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [langRes, yearsRes, studentsRes] = await Promise.all([
        api.get('/admin/available-languages'),
        api.get('/admin/available-years'),
        api.get('/admin/language-filter'),
      ]);

      const loadedStudents: Student[] = studentsRes.data.students || [];
      setStudents(loadedStudents);
      setFilteredStudents(loadedStudents);

      setAvailableLanguages(langRes.data.languages || []);
      const yearsFromApi = yearsRes.data.years || [];
      const yearsFromData = Array.from(new Set(
        loadedStudents
          .map(s => s.year_of_passing)
          .filter((y): y is number => y != null && y > 0)
      )).sort((a, b) => b - a);
      setAvailableYears(yearsFromApi.length ? yearsFromApi : yearsFromData);

      // Extract unique courses from student data
      const courses = Array.from(new Set(
        loadedStudents.map(s => s.course).filter(Boolean)
      )).sort() as string[];
      setAvailableCourses(courses);

      toast.success('Data loaded successfully');
    } catch (err: any) {
      console.error('[Language Filter] Fetch error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to load data';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    if (!selectedLanguage && !minQuestions && !selectedCourse && !selectedYear) {
      setFilteredStudents(students);
      return;
    }

    try {
      const params: any = {};
      if (selectedLanguage) params.language = selectedLanguage;
      if (minQuestions) params.minQuestions = minQuestions;
      if (selectedCourse) params.course = selectedCourse;
      if (selectedYear) params.year_of_passing = selectedYear;

      const res = await api.get('/admin/language-filter', { params });
      setFilteredStudents(res.data.students || []);
      toast.success(`Found ${res.data.students.length} student(s)`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to apply filter';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleExportToExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error('No data to export');
      return;
    }

    const excelData = filteredStudents.map(student => ({
      'Name': student.name,
      'Registration No': student.registration_no || 'N/A',
      'Course': student.course || 'N/A',
      'Section': student.section || 'N/A',
      'Year of Passing': student.year_of_passing != null ? String(student.year_of_passing) : 'N/A',
      'Email': student.email,
      [selectedLanguage || 'Total Questions']: selectedLanguage
        ? (student.languages[selectedLanguage] || 0)
        : Object.values(student.languages).reduce((sum, count) => sum + count, 0),
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 15 },
      { wch: 10 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    let filename = 'students';
    if (selectedCourse) filename += `_${selectedCourse}`;
    if (selectedYear) filename += `_${selectedYear}`;
    if (selectedLanguage) filename += `_${selectedLanguage}_${minQuestions || 0}+questions`;
    filename += '.xlsx';

    XLSX.writeFile(wb, filename);
    toast.success('Excel file downloaded successfully');
  };

  const handleReset = () => {
    setSelectedLanguage('');
    setSelectedCourse('');
    setSelectedYear('');
    setMinQuestions('');
    setFilteredStudents(students);
  };

  const thStyle: React.CSSProperties = {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>
            Language Filter
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Filter students by programming language and questions solved
          </p>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Filter Section */}
        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
            Filter Options
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label className="form-label">Course</label>
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="form-input">
                <option value="">All Courses</option>
                {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Year of Passing</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="form-input">
                <option value="">All Years</option>
                {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Programming Language</label>
              <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="form-input">
                <option value="">All Languages</option>
                {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="form-label">Minimum Questions</label>
              <input
                type="number"
                value={minQuestions}
                onChange={e => setMinQuestions(e.target.value)}
                placeholder="e.g., 50"
                min="0"
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button onClick={handleFilter} className="btn btn-primary"
                style={{ flex: 1, padding: '0.7rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                Apply Filter
              </button>
              <button onClick={handleReset} className="btn btn-secondary"
                style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary & Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface/20 rounded-xl border border-white/5">
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Showing <span className="text-accent-purple font-black">{filteredStudents.length}</span> student(s)
            {selectedCourse && <span style={{ color: 'var(--text-muted)' }}> from {selectedCourse}</span>}
            {selectedYear && <span style={{ color: 'var(--text-muted)' }}> passing in {selectedYear}</span>}
            {selectedLanguage && <span style={{ color: 'var(--text-muted)' }}> with {minQuestions || '0'}+ {selectedLanguage} questions</span>}
          </p>
          <button
            onClick={handleExportToExcel}
            disabled={filteredStudents.length === 0}
            className="btn btn-primary"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 700,
              opacity: filteredStudents.length === 0 ? 0.5 : 1,
              cursor: filteredStudents.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={18} />
            Export to Excel
          </button>
        </div>

        {/* Results Table */}
        <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p style={{ color: 'var(--text-muted)' }}>Loading students...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Registration No</th>
                    <th style={thStyle}>Course</th>
                    <th style={thStyle}>Section</th>
                    <th style={thStyle}>Year of Passing</th>
                    <th style={thStyle}>
                      {selectedLanguage ? `${selectedLanguage} Questions` : 'Top Languages'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No students found matching the criteria
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <tr
                        key={student.id}
                        style={{
                          borderBottom: index < filteredStudents.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{student.name}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {student.registration_no || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {student.course || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {student.section || 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {student.year_of_passing ?? 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {selectedLanguage ? (
                            <div style={{
                              fontSize: '1rem', fontWeight: 700, color: '#f97316',
                              display: 'inline-block', padding: '0.25rem 0.75rem',
                              background: 'rgba(249, 115, 22, 0.1)',
                              borderRadius: '0.5rem', border: '1px solid rgba(249, 115, 22, 0.2)',
                            }}>
                              {student.languages[selectedLanguage] || 0}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {Object.entries(student.languages)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 3)
                                .map(([lang, count]) => `${lang}: ${count}`)
                                .join(', ') || 'No data'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
