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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import DeleteIcon from '@mui/icons-material/Delete';
import type { AppNotification } from '../Types/Notification_types';

interface NotificationDetailDialogProps {
  notification: AppNotification;
  onClose: () => void;
  onDelete: (notificationID: string) => void;
  onInvitationAction: (notificationID: string, status: 'accepted' | 'declined') => void;
}

// Show full date-time (different from formatRelativeTime in NotificationBell, used in the compact list)
function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Full detail popup for a single notification — opened by clicking an item in NotificationBell
export default function NotificationDetailDialog({
  notification,
  onClose,
  onDelete,
  onInvitationAction,
}: NotificationDetailDialogProps) {
  const isInvitation = notification.kind === 'invitation';
  const isPendingInvitation = isInvitation && notification.actionStatus === 'pending';

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
          {isInvitation ? (
            <GroupAddIcon sx={{ color: 'primary.main', mt: '2px' }} />
          ) : (
            <CampaignIcon sx={{ color: 'warning.main', mt: '2px' }} />
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.4 }}>
            {notification.title}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {formatFullDate(notification.createdDate)}
        </Typography>

        {notification.kind === 'general' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {notification.message}
          </Typography>
        )}

        {notification.kind === 'invitation' && (
          <>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
              Team #{notification.inviterTeamID} invited you to join the team
            </Typography>

            {notification.actionStatus !== 'pending' && (
              <Chip
                size="small"
                label={notification.actionStatus === 'accepted' ? 'Accepted' : 'Declined'}
                sx={{
                  alignSelf: 'flex-start',
                  fontWeight: 600,
                  color: notification.actionStatus === 'accepted' ? 'success.main' : 'error.main',
                  borderColor: notification.actionStatus === 'accepted' ? 'success.main' : 'error.main',
                  bgcolor: 'transparent',
                  border: '1px solid',
                }}
              />
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteIcon fontSize="small" />}
          onClick={() => {
            onDelete(notification.notificationID);
            onClose();
          }}
          sx={{ textTransform: 'none' }}
        >
          Delete
        </Button>

        {isPendingInvitation ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                onInvitationAction(notification.notificationID, 'declined');
                onClose();
              }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                onInvitationAction(notification.notificationID, 'accepted');
                onClose();
              }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              Accept
            </Button>
          </Box>
        ) : (
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}