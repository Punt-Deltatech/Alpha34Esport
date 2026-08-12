import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import type { Tournament } from '../Types/Tournament_types';
import type { Team, Member } from '../Types/Team_types';
import ScrollBox from '../../components/ScrollBox';

interface SignupConfirmModalProps {
  tournament: Tournament;
  team: Team;
  onClose: () => void;
  onConfirm: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MemberRow({ member, requireAttachment }: { member: Member; requireAttachment: boolean }) {
  const missingPortfolio = requireAttachment && !member.portfolio;

  return (
    <Box
      sx={{
        p: 1.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: missingPortfolio ? 'warning.main' : 'divider',
        bgcolor: 'rgba(255,255,255,0.02)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Avatar
          src={member.avatar || undefined}
          sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 14 }}
        >
          {member.name.charAt(0)}
        </Avatar>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {member.name}
        </Typography>
        {member.isOwner && (
          <Chip
            label="Captain"
            size="small"
            sx={{
              height: 20,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: 'rgba(88, 101, 242, 0.15)',
              color: 'primary.main',
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: member.portfolio || missingPortfolio ? 1 : 0 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            User ID
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {member.userid}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Game ID
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {member.gameUID || '—'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Role
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {member.role}
          </Typography>
        </Box>
      </Box>

      {member.portfolio ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <BadgeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <Typography
            component="a"
            href={member.portfolio.fileData}
            download={member.portfolio.fileName}
            variant="caption"
            sx={{ color: 'primary.main', textDecoration: 'none' }}
          >
            {member.portfolio.fileName} · {formatFileSize(member.portfolio.fileSize)}
          </Typography>
        </Box>
      ) : (
        missingPortfolio && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <WarningAmberIcon sx={{ fontSize: 14, color: 'warning.main' }} />
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              Portfolio not attached
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
}

export default function SignupConfirmModal({ tournament, team, onClose, onConfirm }: SignupConfirmModalProps) {
  const { detail } = tournament;
  const membersMissingPortfolio = detail.requireAttachment
    ? team.members.filter((m) => !m.portfolio)
    : [];
  const canConfirm = membersMissingPortfolio.length === 0;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmojiEventsIcon sx={{ color: 'primary.main' }} />
          Confirm Registration
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Team identity */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={team.logo || undefined}
            variant="rounded"
            sx={{ width: 44, height: 44, bgcolor: 'primary.main', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}
          >
            {team.name.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {team.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {team.members.length} Members
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Are you sure you want to register for{' '}
          <strong style={{ color: 'inherit' }}>{tournament.tournamentName}</strong>?
        </Typography>

        {/* Tournament summary */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
            {tournament.tournamentName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Prize Pool
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ${detail.prizePool.toLocaleString('en-US')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Register Deadline
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {new Date(detail.registerDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Max Teams
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {detail.maxTeam} teams
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Team roster */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Team Roster ({team.members.length} members)
            </Typography>
            {detail.requireAttachment && (
              <Chip
                icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                label="Portfolio required for all members"
                size="small"
                sx={{
                  fontWeight: 600,
                  borderColor: 'warning.main',
                  color: 'warning.main',
                  bgcolor: 'transparent',
                  border: '1px solid',
                  '& .MuiChip-icon': { color: 'warning.main' },
                }}
              />
            )}
          </Box>

          <ScrollBox sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, maxHeight: 280, pr: 0.5 }}>
            {team.members.map((member) => (
              <MemberRow key={member.userid} member={member} requireAttachment={detail.requireAttachment} />
            ))}
          </ScrollBox>
        </Box>

        {!canConfirm && (
          <Typography variant="caption" sx={{ color: 'warning.main' }}>
            ⚠ {membersMissingPortfolio.length} member(s) missing portfolio — this tournament requires all members to attach a file before registering (please attach files on the My Team page).
          </Typography>
        )}

        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Once confirmed, registration cannot be cancelled unless permitted by tournament administrators.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={!canConfirm}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          Confirm Registration
        </Button>
      </DialogActions>
    </Dialog>
  );
}