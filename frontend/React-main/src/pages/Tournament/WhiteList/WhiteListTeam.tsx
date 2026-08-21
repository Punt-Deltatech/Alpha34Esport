import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScrollBox from '../../../components/ScrollBox';
import { mapWhitelistTeam, type WhitelistTeam as WhitelistTeamEntry } from '../../Types/WhiteList_types';
import { listWhitelistForTournament } from '../../../services/applicationService';

interface WhitelistTeamProps {
  tournamentID: string;
}

function formatApprovedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// การ์ด "ทีมที่ผ่านการอนุมัติแล้ว" — วางไว้ใน TournamentDetail (View Detail) ข้าง ๆ About/Organizer
// โหลดจาก backend จริงทุกครั้งที่เปิด (tournamentID เปลี่ยน) แทนการอ่าน localStorage
export default function WhitelistTeam({ tournamentID }: WhitelistTeamProps) {
  const [teams, setTeams] = useState<WhitelistTeamEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWhitelistForTournament(tournamentID)
      .then((list) => {
        if (!cancelled) setTeams(list.map(mapWhitelistTeam));
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentID]);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <GroupsIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Approved Teams ({teams.length})
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      ) : teams.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No approved teams yet
        </Typography>
      ) : (
        <ScrollBox sx={{ maxHeight: 220, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {teams.map((w) => (
            <Box
              key={w.whitelistID}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                py: 0.75,
                px: 1,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  {w.teamName}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                {formatApprovedDate(w.approvedDate)}
              </Typography>
            </Box>
          ))}
        </ScrollBox>
      )}
    </Box>
  );
}
