import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import CreateTeamForm, { type CreateTeamFormValues } from './Form/CreateTeamForm';
import Myteam from './MyTeam';
import type { PersonalForm } from './Form/PersonalForm';
import type { Team } from '../Types/Team_types';
import { mapApiTeamToTeam } from '../Types/Team_types';
import { useAuth } from '../../hooks/useAuth';
import * as teamService from '../../services/teamService';
import { uploadDataUrl } from '../../services/uploadService';
import { extractApiErrorMessage } from '../../lib/apiClient';

// Container for Module 4: Team & Member Management. Owns all data-fetching/mutation against
// the Go backend and adapts it into the plain Team/Member shape MyTeam.tsx and its forms
// already expect (see Team_types.ts) — none of the presentational components below had to change.
export default function GetStarted() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const apiTeam = await teamService.getMyTeam(user.id);
      setTeam(apiTeam ? mapApiTeamToTeam(apiTeam) : null);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void reload();
  }, [authLoading, reload]);

  if (authLoading || loading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  const handleCreate = async (values: CreateTeamFormValues) => {
    await teamService.createTeam({
      team_name: values.name,
      game: values.game,
      description: values.description,
      max_member: values.maxMembers,
      social_url: values.social,
      logo_url: values.logo,
      captain_fullname: values.ownerName,
    });
    setShowForm(false);
    await reload();
  };

  const handleUpdateMember = async (memberId: string, data: PersonalForm) => {
    if (!team) return;
    const member = team.members.find((m) => m.userid === memberId);
    if (!member) return;

    await teamService.updateTeamMember(team.id, member.rosterId, {
      fullname: data.fullname,
      role: data.role === 'Substitute' ? 'substitute' : 'starter',
      game_uid: data.gameUID,
      phone: data.phone,
      social_contact: data.socialContact,
      avatar: data.avatar,
    });

    // Only re-upload if a *new* file was picked (base64 data URL) — an unchanged
    // portfolio's fileData is already the resolved http(s) URL from the last load.
    if (data.portfolio?.fileData?.startsWith('data:')) {
      const uploaded = await uploadDataUrl(data.portfolio.fileData, data.portfolio.fileName);
      await teamService.setMemberPortfolio(team.id, member.rosterId, uploaded);
    }

    await reload();
  };

  const handleUpdateTeam = async (
    updates: Pick<Team, 'name' | 'game' | 'description' | 'maxMembers' | 'social' | 'logo'>,
  ) => {
    if (!team) return;
    await teamService.updateTeam(team.id, {
      team_name: updates.name,
      game: updates.game,
      description: updates.description,
      max_member: updates.maxMembers,
      social_url: updates.social,
      logo_url: updates.logo,
    });
    await reload();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    const member = team.members.find((m) => m.userid === memberId);
    if (!member) return;
    await teamService.removeTeamMember(team.id, member.rosterId);
    await reload();
  };

  const handleDisband = async () => {
    if (!team) return;
    await teamService.deleteTeam(team.id);
    setTeam(null);
  };

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (team) {
    return (
      <Myteam
        team={team}
        currentUserId={user!.id}
        onDisband={handleDisband}
        onUpdateMember={handleUpdateMember}
        onUpdateTeam={handleUpdateTeam}
        onRemoveMember={handleRemoveMember}
      />
    );
  }

  // ถ้ากำลังเปิดฟอร์มอยู่ ให้โชว์แค่ฟอร์มอย่างเดียว ไม่โชว์การ์ดด้านบน
  if (showForm) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <CreateTeamForm onClose={() => setShowForm(false)} onCreate={handleCreate} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#3f4147', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '24px' }}>
            👤
          </div>

          <p style={{ fontSize: '14px', color: '#949ba4', margin: '0 0 4px 0' }}>
            Hello, User
          </p>

          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>
            You don't have a team yet!
          </h2>

          <p style={{ fontSize: '14px', color: '#949ba4', margin: '0 0 24px 0', lineHeight: '1.5' }}>
            Create your own team, invite your teammates, and start joining tournaments.
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
          >
            + Create Team
          </button>
        </div>
      </div>
    </div>
  );
}
