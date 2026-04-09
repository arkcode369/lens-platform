'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/client';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  joinedAt: string | null;
}

interface TeamData {
  members: TeamMember[];
  limit: number;
  currentCount: number;
}

export default function TeamSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/team/members');
      const data = await response.json();
      setTeamData(data);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setError('Failed to load team members');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/team/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchTeamMembers();
      setInviteEmail('');
      setInviteRole('member');
    } catch (error: any) {
      setError(error.message || 'Failed to invite team member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    setLoading(userId);
    setError(null);

    try {
      const response = await fetch(
        `/api/team/members/${userId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchTeamMembers();
    } catch (error: any) {
      setError(error.message || 'Failed to remove team member');
    } finally {
      setLoading(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setLoading(userId);
    setError(null);

    try {
      const response = await fetch(`/api/team/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      await fetchTeamMembers();
    } catch (error: any) {
      setError(error.message || 'Failed to update role');
    } finally {
      setLoading(null);
    }
  };

  if (!teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Team Settings
        </h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Team Usage */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Team Members
          </h2>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 dark:text-gray-400">
              {teamData.currentCount} of {teamData.limit === Infinity ? 'Unlimited' : teamData.limit}{' '}
              members
            </p>
            {teamData.limit !== Infinity && (
              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full"
                  style={{
                    width: `${(teamData.currentCount / teamData.limit) * 100}%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Invite Team Member */}
        {teamData.currentCount < teamData.limit && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Invite Team Member
            </h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="colleague@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
              >
                {inviteLoading ? 'Inviting...' : 'Invite Member'}
              </button>
            </form>
          </div>
        )}

        {/* Team Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Current Members
          </h2>
          <div className="space-y-4">
            {teamData.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.name || 'No name'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleUpdateRole(member.id, e.target.value)
                    }
                    disabled={loading === member.id}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  {member.id !== session?.user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={loading === member.id}
                      className="px-3 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm"
                    >
                      {loading === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {teamData.members.length === 0 && (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No team members yet. Invite your first team member above!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
