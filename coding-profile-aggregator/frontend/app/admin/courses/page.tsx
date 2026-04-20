'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import UserTable from '@/components/admin/UserTable';
import StatsCard from '@/components/admin/StatsCard';
import { User, Code, Trophy, BarChart3 } from '@/components/icons';
import toast from 'react-hot-toast';

interface CourseData {
  course: string;
  stats: {
    totalStudents: number;
    totalProblems: number;
    avgProblems: string;
    topPerformer: any;
  };
  sectionBreakdown: Array<{
    section: string;
    student_count: number;
    total_problems: number;
  }>;
  students: any[];
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseData(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/admin/users');
      const uniqueCourses = Array.from(
        new Set(data.users.map((u: any) => u.course).filter(Boolean))
      ) as string[];
      setCourses(uniqueCourses.sort());
      if (uniqueCourses.length > 0) {
        setSelectedCourse(uniqueCourses[0]);
      }
    } catch (err: any) {
      console.error('Failed to fetch courses:', err);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseData = async (course: string) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/admin/course/${course}`);
      setCourseData(data);
    } catch (err: any) {
      console.error('Failed to fetch course data:', err);
      toast.error('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Course View</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>View students and statistics by course</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Course Selector */}
      <div>
        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Select Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="w-full max-w-xs px-4 py-2 border rounded-lg transition-colors form-input"
          style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading course data...</p>
        </div>
      ) : courseData ? (
        <>
          {/* Course Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatsCard
              title="Total Students"
              value={courseData.stats.totalStudents}
              icon={<User size={24} style={{ color: '#a78bfa' }} />}
              subtitle={`In ${courseData.course}`}
              color="purple"
            />
            <StatsCard
              title="Total Problems"
              value={courseData.stats.totalProblems}
              icon={<Code size={24} style={{ color: '#06b6d4' }} />}
              subtitle="Solved by all students"
              color="cyan"
            />
            <StatsCard
              title="Average Problems"
              value={parseFloat(courseData.stats.avgProblems).toFixed(1)}
              icon={<Trophy size={24} style={{ color: '#eab308' }} />}
              subtitle="Per student"
              color="yellow"
            />
            <StatsCard
              title="Sections"
              value={courseData.sectionBreakdown.length}
              icon={<BarChart3 size={24} style={{ color: '#60a5fa' }} />}
              subtitle="Active sections"
              color="blue"
            />
          </div>

          {/* Top Performer */}
          {courseData.stats.topPerformer && (
            <div className="glass-card overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <div className="bg-grad-orange px-6 py-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">Course MVP</span>
              </div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-2xl" 
                         style={{ background: 'var(--grad-orange)', border: '4px solid rgba(255,255,255,0.1)' }}>
                      {courseData.stats.topPerformer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white text-orange-600 rounded-lg p-1.5 shadow-xl border border-orange-100">
                        <Trophy size={16} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-black text-white">{courseData.stats.topPerformer.name}</h2>
                        <span className="badge badge-warning text-[10px]">RANK #1</span>
                    </div>
                    <p className="text-muted font-medium mb-2">{courseData.stats.topPerformer.email}</p>
                    <div className="flex items-center gap-3">
                        <span className="badge badge-purple">Section {courseData.stats.topPerformer.section}</span>
                        <span className="w-1 h-1 rounded-full bg-muted"></span>
                        <span className="text-secondary text-sm font-bold">{courseData.course}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center min-w-[140px] backdrop-blur-md">
                    <p className="text-3xl font-black text-orange-500 mb-1">
                      {courseData.stats.topPerformer.total_problems}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Problems Solved</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section Breakdown */}
          <div className="glass-card p-4 md:p-6" style={{ border: '1px solid var(--border)' }}>
            <h2 className="section-title">
              <span className="section-title-bar" />
              Section Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {courseData.sectionBreakdown.map((section) => (
                <div
                  key={section.section}
                  className="stat-card stat-card-purple p-5 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-purple">Section</span>
                        <div className="text-xl font-black text-white">{section.section}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-black text-white">{section.student_count}</div>
                        <div className="text-[10px] uppercase font-bold text-muted">Students</div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-y border-white/5">
                        <span className="text-xs font-medium text-muted">Total Solved</span>
                        <span className="text-sm font-bold text-white">{section.total_problems}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted">Avg / Student</span>
                        <span className="text-sm font-bold text-accent-purple">
                            {section.student_count > 0 
                                ? (section.total_problems / section.student_count).toFixed(1)
                                : 0}
                        </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Students Table */}
          <div className="glass-card overflow-hidden p-4 md:p-6" style={{ border: '1px solid var(--border)' }}>
            <h2 className="section-title" style={{ marginBottom: '1rem' }}>
              <span className="section-title-bar" />
              All Students in {courseData.course}
            </h2>
            <UserTable users={courseData.students} />
          </div>
        </>
      ) : (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          No data available for this course
        </div>
      )}
      </div>
    </div>
  );
}
