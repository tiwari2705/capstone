'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import UserTable from '@/components/admin/UserTable';
import SearchBar from '@/components/admin/SearchBar';
import FilterBar from '@/components/admin/FilterBar';
import toast from 'react-hot-toast';
import { Download } from '@/components/icons';
import * as XLSX from 'xlsx';

interface User {
  id: number;
  name: string;
  email: string;
  registration_no?: string;
  course?: string;
  section?: string;
  year_of_passing?: number;
  verified_profiles: number;
  total_problems: number;
  total_score: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Extract unique courses, sections, and years
  const courses = Array.from(new Set(users.map(u => u.course).filter(Boolean))) as string[];
  const sections = Array.from(new Set(users.map(u => u.section).filter(Boolean))) as string[];
  const years = Array.from(new Set(users.map(u => u.year_of_passing).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[];
  
  // Ensure arrays are never undefined
  const safeYears = years || [];

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, selectedCourse, selectedSection, selectedYear, sortBy, sortOrder, offset]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit,
        offset,
        sort: sortBy,
        order: sortOrder,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedCourse) params.course = selectedCourse;
      if (selectedSection) params.section = selectedSection;
      if (selectedYear) params.year_of_passing = selectedYear;

      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setOffset(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setOffset(0);
  };

  const handleReset = () => {
    setSelectedCourse('');
    setSelectedSection('');
    setSelectedYear('');
    setSearchQuery('');
    setOffset(0);
  };

  const handleNextPage = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleExportToExcel = () => {
    if (users.length === 0) {
      toast.error('No data to export');
      return;
    }

    // Prepare data for Excel
    const excelData = users.map(user => ({
      'Name': user.name,
      'Registration No': user.registration_no || 'N/A',
      'Email': user.email,
      'Course': user.course || 'N/A',
      'Section': user.section || 'N/A',
      'Year of Passing': user.year_of_passing ? String(user.year_of_passing) : 'N/A',
      'Total Problems Solved': user.total_problems || 0,
      'Total Score': user.total_score ? (typeof user.total_score === 'string' ? parseFloat(user.total_score).toFixed(2) : user.total_score.toFixed(2)) : '0.00',
      'Verified Profiles': user.verified_profiles || 0
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 20 }, // Registration No
      { wch: 30 }, // Email
      { wch: 15 }, // Course
      { wch: 10 }, // Section
      { wch: 15 }, // Year of Passing
      { wch: 20 }, // Total Problems
      { wch: 15 }, // Total Score
      { wch: 18 }  // Verified Profiles
    ];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');

    // Generate filename with filters
    let filename = 'users';
    if (selectedCourse) filename += `_${selectedCourse}`;
    if (selectedSection) filename += `_section${selectedSection}`;
    if (selectedYear) filename += `_year${selectedYear}`;
    filename += '.xlsx';

    // Download
    XLSX.writeFile(wb, filename);
    toast.success('Excel file downloaded successfully');
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Users Management</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Search, filter, and manage all registered users</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Search and Filters */}
      <div className="space-y-4">
        <SearchBar onSearch={handleSearch} />
        <FilterBar
          courses={courses}
          sections={sections}
          years={safeYears}
          selectedCourse={selectedCourse}
          selectedSection={selectedSection}
          selectedYear={selectedYear}
          onCourseChange={setSelectedCourse}
          onSectionChange={setSelectedSection}
          onYearChange={setSelectedYear}
          onReset={handleReset}
        />
      </div>

      {/* Results Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface/20 rounded-xl border border-white/5">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Showing <span className="text-white font-bold">{offset + 1}</span> - <span className="text-white font-bold">{Math.min(offset + limit, total)}</span> of <span className="text-accent-purple font-black">{total}</span> total users
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportToExcel}
            disabled={users.length === 0}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              opacity: users.length === 0 ? 0.5 : 1,
              cursor: users.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={18} />
            Export to Excel
          </button>
          <button
            onClick={handlePrevPage}
            disabled={offset === 0}
            className="btn btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed">
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={offset + limit >= total}
            className="btn btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed">
            Next
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading users...</p>
          </div>
        ) : (
          <UserTable
            users={users}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>
      </div>
    </div>
  );
}
