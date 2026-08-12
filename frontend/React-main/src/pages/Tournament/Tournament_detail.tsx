import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PaidIcon from '@mui/icons-material/Paid';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import type { ReactNode } from 'react';
import type { ApplicationStatus, Tournament } from '../Types/Tournament_types';
import { scrollbarStyles } from '../../components/ScrollBox';


interface TournamentDetailProps {
  tournament: Tournament;
  registeredTeamCount: number;
  applicationStatus: ApplicationStatus;
  onClose: () => void;
  onSignUp: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ตัด description ให้เหลือแค่ย่อหน้าแรก (ก่อนหัวข้อ 📍/🏆/👥/📋 หรือขึ้นบรรทัดใหม่คู่) ไว้โชว์ใน About section
// รายละเอียดที่เหลือ (venue/prize breakdown/rules) ยังไม่มีที่โชว์ในดีไซน์ใหม่นี้
function getIntro(description: string): string {
  const sectionMarkers = ['📍', '🏆', '👥', '📋'];
  let cutIndex = description.length;
  for (const marker of sectionMarkers) {
    const idx = description.indexOf(marker);
    if (idx !== -1 && idx < cutIndex) cutIndex = idx;
  }
  const doubleNewlineIdx = description.indexOf('\n\n');
  if (doubleNewlineIdx !== -1 && doubleNewlineIdx < cutIndex) cutIndex = doubleNewlineIdx;
  return description.slice(0, cutIndex).trim();
}

export function statusMeta(status: string): { label: string; color: 'primary' | 'success' | 'default' } {
  if (status === 'ongoing') return { label: 'Ongoing', color: 'success' };
  if (status === 'completed') return { label: 'Completed', color: 'default' };
  if (status === 'closed') return { label: 'Closed', color: 'default' };
  return { label: 'Upcoming', color: 'primary' }; // status === 'open'
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Box
      sx={{
        flex: '1 1 130px',
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        {icon}
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function TournamentDetail({
  tournament,
  registeredTeamCount,
  applicationStatus,
  onClose,
  onSignUp,
}: TournamentDetailProps) {
  const { detail } = tournament;
  const slotOpen = Math.max(0, detail.maxTeam - registeredTeamCount);
  const isClosed = tournament.status !== 'open';
  const status = statusMeta(tournament.status);
  const intro = getIntro(detail.description);
  const hasApplied = applicationStatus === 'pending' || applicationStatus === 'approved';

  const joinDisabled = hasApplied || isClosed || slotOpen === 0;
  const joinLabel =
    applicationStatus === 'pending'
      ? 'Pending Review'
      : applicationStatus === 'approved'
        ? 'Registered'
        : isClosed
          ? 'Ended'
          : slotOpen === 0
            ? 'Full'
            : 'Join Tournament';

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogContent
        sx={(theme) => ({
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          ...scrollbarStyles(theme),
        })}
      >
        {/* Hero banner */}
        <Box
          sx={{
            position: 'relative',
            borderRadius: 3,
            overflow: 'hidden',
            minHeight: 220,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            p: 2.5,
            background: tournament.bannerUrl
              ? `url(${tournament.bannerUrl}) center / cover no-repeat`
              : 'linear-gradient(135deg, rgba(88,101,242,0.20), rgba(43,45,49,0.5))',
          }}
        >
          {!tournament.bannerUrl && (
            <EmojiEventsIcon
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -60%)',
                fontSize: 120,
                color: 'rgba(255,255,255,0.08)',
              }}
            />
          )}

          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              color: 'text.secondary',
              bgcolor: 'rgba(43,45,49,0.85)',
              '&:hover': { bgcolor: 'rgba(43,45,49,1)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, position: 'relative' }}>
            <Chip
              label={status.label}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: status.color === 'primary' ? 'rgba(88,101,242,0.15)' : 'rgba(43,45,49,0.85)',
                border: '1px solid',
                borderColor: status.color === 'primary' ? 'primary.main' : status.color === 'success' ? 'success.main' : 'divider',
                color: status.color === 'primary' ? 'primary.main' : status.color === 'success' ? 'success.main' : 'text.secondary',
              }}
            />
            <Chip
              icon={<SportsEsportsIcon sx={{ fontSize: 16, color: 'text.primary !important' }} />}
              label={tournament.game}
              size="small"
              sx={{ fontWeight: 700, bgcolor: 'rgba(20,21,23,0.85)', color: 'text.primary' }}
            />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', position: 'relative' }}>
            {tournament.tournamentName}
          </Typography>
        </Box>

        {/* Stat cards */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <StatCard
            icon={<PaidIcon sx={{ fontSize: 16, color: 'warning.main' }} />}
            label="PRIZE POOL"
            value={`$${detail.prizePool.toLocaleString('en-US')}`}
          />
          <StatCard
            icon={<CalendarMonthIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
            label="START DATE"
            value={formatDate(tournament.startDate)}
          />
          <StatCard
            icon={<GroupsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
            label="MAX TEAMS"
            value={String(detail.maxTeam)}
          />
          <StatCard
            icon={<EmojiEventsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
            label="FORMAT"
            value={detail.format}
          />
        </Box>

        {/* About */}
        {intro && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(255,255,255,0.02)',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              About this Tournament
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              {intro}
            </Typography>
          </Box>
        )}

        {/* Organizer */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Organizer
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {detail.organizer}
          </Typography>
        </Box>

        {detail.requireAttachment && !hasApplied && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachFileIcon sx={{ fontSize: 16, color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              This tournament requires an additional file attachment at sign-up
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={joinDisabled}
          onClick={onSignUp}
          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600, px: 3 }}
        >
          {joinLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}