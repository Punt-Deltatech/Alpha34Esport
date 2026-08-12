import { useEffect, useState } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  Box,
  Typography,
} from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CampaignIcon from '@mui/icons-material/Campaign';
import DeleteIcon from '@mui/icons-material/Delete';
import ScrollBox from '../../components/ScrollBox';
import NotificationDetailDialog from './NotificationDetailDialog';
// Changed from '../Team_types' to './Notification_types' — AppNotification is declared here, not in Team_types
import type { AppNotification } from '../Types/Notification_types';
import { joinTeamAsMember } from '../Types/Team_types';

const STORAGE_KEY = 'esports_notifications';

// Initial data: only the welcome notification, no other mock data
const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    kind: 'general',
    notificationID: 'welcome_1',
    title: 'Welcome',
    isRead: false,
    createdDate: new Date().toISOString(),
    message: 'Welcome to 34Esport!',
    category: 'system',
    referenceID: 'welcome',
  },
];

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedID, setSelectedID] = useState<string | null>(null);

  const loadFromStorage = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  };

  useEffect(() => {
    loadFromStorage();

    // Writing to localStorage from another tab/window automatically fires the 'storage' event
    // But writing from the same tab (e.g. RefereeReview calling notifyApplicationDecision) won't fire this event
    // So a custom event 'esports-notifications-changed' is also needed, to let the bell refresh live within the same tab too
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) loadFromStorage();
    };
    const handleCustom = () => loadFromStorage();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('esports-notifications-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('esports-notifications-changed', handleCustom);
    };
  }, []);

  const persist = (updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const markAsRead = (notificationID: string) => {
    persist(notifications.map((n) => (n.notificationID === notificationID ? { ...n, isRead: true } : n)));
  };

  const handleInvitationAction = (notificationID: string, status: 'accepted' | 'declined') => {
    const target = notifications.find((n) => n.notificationID === notificationID);
    if (!target || target.kind !== 'invitation') return;

    // Clicking "Accept" must actually add the user to the team, not just change the notification card status
    if (status === 'accepted') {
      const result = joinTeamAsMember(target.inviteeUserID);
      if (!result.ok) {
        const messages: Record<typeof result.reason, string> = {
          'no-team': 'Your team could not be found. Please create a team before accepting the invitation.',
          'already-member': 'You are already a member of this team.',
          'roster-full': 'The team is full. Cannot add more members right now.',
        };
        window.alert(messages[result.reason]);
        return; // Don't change the invitation status, in case they resolve the issue and come back to accept again
      }
    }

    persist(
      notifications.map((n) =>
        n.notificationID === notificationID && n.kind === 'invitation'
          ? { ...n, actionStatus: status, isRead: true }
          : n
      )
    );
  };

  // Remove the notification from the list (no confirm needed since it's a lightweight action that doesn't affect team data)
  const handleDeleteNotification = (notificationID: string) => {
    persist(notifications.filter((n) => n.notificationID !== notificationID));
  };

  const selected = notifications.find((n) => n.notificationID === selectedID) ?? null;

  return (
    <>
      <IconButton
        onClick={handleOpen}
        sx={{
          bgcolor: '#2b2d31',
          border: '1px solid #3f4147',
          borderRadius: '8px',
          color: 'white',
          p: 1,
        }}
        aria-label="Notifications"
      >
        <Badge badgeContent={unreadCount} color="error">
          <MailIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 480, bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' },
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No notifications
            </Typography>
          </Box>
        ) : (
          // The list can be longer than the screen, so scroll with the shared ScrollBox (thin themed scrollbar, like other pages in the app)
          // instead of letting the Popover Paper scroll on its own (thick default browser scrollbar)
          <ScrollBox sx={{ maxHeight: 420 }}>
            {notifications
              .slice()
              .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
              .map((n, idx) => (
                <Box key={n.notificationID}>
                  {idx > 0 && <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}
                  <Box
                    onClick={() => {
                      markAsRead(n.notificationID);
                      setSelectedID(n.notificationID);
                    }}
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      p: 2,
                      cursor: 'pointer',
                      bgcolor: n.isRead ? 'transparent' : 'rgba(88, 101, 242, 0.06)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                      position: 'relative',
                    }}
                  >
                    <Box sx={{ pt: 0.25 }}>
                      {n.kind === 'invitation' ? (
                        <GroupAddIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      ) : (
                        <CampaignIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: n.isRead ? 500 : 700 }}>
                          {n.title}
                        </Typography>
                        {!n.isRead && (
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                        )}
                      </Box>

                      {/* Single-line preview — full details can be viewed in the popup when clicked (NotificationDetailDialog) */}
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mt: 0.25,
                        }}
                      >
                        {n.kind === 'general' ? n.message : `Team #${n.inviterTeamID} invited you to join`}
                      </Typography>

                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                        {formatRelativeTime(n.createdDate)}
                      </Typography>
                    </Box>

                    {/* Delete notification button */}
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the detail view when clicking delete
                        handleDeleteNotification(n.notificationID);
                      }}
                      aria-label="Delete notification"
                      sx={{
                        color: 'text.disabled',
                        alignSelf: 'flex-start',
                        '&:hover': { color: 'error.main', bgcolor: 'rgba(244, 67, 54, 0.08)' },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
          </ScrollBox>
        )}
      </Popover>

      {selected && (
        <NotificationDetailDialog
          notification={selected}
          onClose={() => setSelectedID(null)}
          onDelete={handleDeleteNotification}
          onInvitationAction={handleInvitationAction}
        />
      )}
    </>
  );
}