const fs = require('fs');
const path = require('path');

const content = `'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import PlatformCard from '@/components/PlatformCard';
import StatCard from '@/components/StatCard';
import { ExternalLink, Share2 } from '@/components/icons';
import toast from 'react-hot-toast';

interface PublicProfile {
  user: { name: string; username: string; email: string; course?: string; section?: string; registration_no?: string; };
  profiles: Array<{ platform: string; username: string; profile_url: string; verified: boolean; }>;
  stats: Record<string, any>;
  totalProblems: number;
  score: string;
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchProfile();
  }, [username]);
  
  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/profile/\${username}\`);
      setProfile(data);
    } catch (err: any) {
      console.error('Failed to fetch profile:', err);
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Profile link copied to clipboard!');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-gray-400 mb-6">{error || 'This profile does not exist'}</p>
          <a href="/" className="text-orange-500 hover:text-orange-400">Go to Home</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">{profile.user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{profile.user.name}</h1>
                <p className="text-gray-400">@{profile.user.username}</p>
                {profile.user.course && (<p className="text-gray-400 text-sm mt-1">{profile.user.course} {profile.user.section && \`- Section \${profile.user.section}\`}</p>)}
              </div>
            </div>
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
              <Share2 size={18} />Share Profile
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard title="Total Problems Solved" value={profile.totalProblems} color="text-orange-500" />
          <StatCard title="Total Score" value={parseFloat(profile.score).toFixed(0)} color="text-blue-500" />
          <StatCard title="Verified Profiles" value={profile.profiles.filter(p => p.verified).length} color="text-green-500" />
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.profiles.map((prof) => {
              const platformStats = profile.stats[prof.platform] || {};
              return <PlatformCard key={prof.platform} platform={prof.platform} username={prof.username} verified={prof.verified} stats={platformStats} />;
            })}
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-4">Profile Links</h2>
          <div className="space-y-3">
            {profile.profiles.map((prof) => (
              <div key={prof.platform} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="capitalize text-white font-medium">{prof.platform}</span>
                  <span className="text-gray-400">@{prof.username}</span>
                  {prof.verified && <span className="text-green-500 text-sm">✓ Verified</span>}
                </div>
                <a href={prof.profile_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-orange-500 hover:text-orange-400 transition-colors">
                  Visit Profile<ExternalLink size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const filePath = path.join(__dirname, 'app', 'profile', '[username]', 'page.tsx');
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Profile page written successfully!');
console.log('File path:', filePath);
console.log('File size:', fs.statSync(filePath).size, 'bytes');
