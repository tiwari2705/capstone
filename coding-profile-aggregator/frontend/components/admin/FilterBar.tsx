'use client';

interface FilterBarProps {
  courses: string[];
  sections: string[];
  selectedCourse: string;
  selectedSection: string;
  onCourseChange: (course: string) => void;
  onSectionChange: (section: string) => void;
  onReset?: () => void;
}

export default function FilterBar({
  courses,
  sections,
  selectedCourse,
  selectedSection,
  onCourseChange,
  onSectionChange,
  onReset
}: FilterBarProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap bg-surface/30 p-4 rounded-xl border border-white/5">
      <div className="flex-1 min-w-[200px]">
        <label className="form-label">Course</label>
        <select
          value={selectedCourse}
          onChange={(e) => onCourseChange(e.target.value)}
          className="form-input"
        >
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="form-label">Section</label>
        <select
          value={selectedSection}
          onChange={(e) => onSectionChange(e.target.value)}
          className="form-input"
        >
          <option value="">All Sections</option>
          {sections.map((section) => (
            <option key={section} value={section}>
              Section {section}
            </option>
          ))}
        </select>
      </div>

      {onReset && (selectedCourse || selectedSection) && (
        <div className="flex items-end h-[68px]">
          <button
            onClick={onReset}
            className="btn btn-secondary py-2"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
