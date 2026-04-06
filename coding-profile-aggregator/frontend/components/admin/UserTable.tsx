'use client';
import Link from 'next/link';
import { ArrowUpDown, ExternalLink } from '../icons';

interface User {
  id: number;
  name: string;
  email: string;
  registration_no?: string;
  course?: string;
  section?: string;
  verified_profiles: number;
  total_problems: number;
  total_score: number;
}

interface UserTableProps {
  users: User[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function UserTable({ users, sortBy, sortOrder, onSort }: UserTableProps) {
  const columns = [
    { key: 'registration_no', label: 'Registration No', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'course', label: 'Course', sortable: true },
    { key: 'section', label: 'Section', sortable: true },
    { key: 'verified_profiles', label: 'Profiles', sortable: true },
    { key: 'total_problems', label: 'Problems', sortable: true },
    { key: 'total_score', label: 'Score', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false },
  ];

  const handleSort = (column: string) => {
    if (onSort) onSort(column);
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <div className="flex items-center gap-2">
                  {column.label}
                  {column.sortable && onSort && (
                    <button
                      onClick={() => handleSort(column.key)}
                      className="text-muted hover:text-accent transition-colors"
                      title={`Sort by ${column.label}`}
                    >
                      <ArrowUpDown size={14} />
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="font-mono text-xs opacity-70">
                {user.registration_no || '-'}
              </td>
              <td>
                <div className="font-bold text-white">{user.name}</div>
              </td>
              <td className="text-muted text-sm italic">
                {user.email}
              </td>
              <td>
                <span className="badge badge-info">{user.course || '-'}</span>
              </td>
              <td>
                <span className="badge badge-purple" style={{ background: 'rgba(167,139,250,0.1)', color: 'var(--text-accent)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  {user.section || '-'}
                </span>
              </td>
              <td className="text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs" 
                      style={{ background: 'var(--grad-blue)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                  {user.verified_profiles}
                </span>
              </td>
              <td className="font-bold">
                {user.total_problems}
              </td>
              <td>
                <span className="font-extrabold text-orange-500">
                  {parseFloat(user.total_score.toString()).toFixed(0)}
                </span>
              </td>
              <td>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="btn btn-ghost btn-sm py-1 px-3"
                  style={{ fontSize: '0.75rem', gap: '0.4rem' }}
                >
                  View
                  <ExternalLink size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          No users found
        </div>
      )}
    </div>
  );
}
