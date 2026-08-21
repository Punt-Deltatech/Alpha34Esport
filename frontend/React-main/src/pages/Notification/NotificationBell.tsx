import { useCallback, useEffect, useState } from 'react';
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
import type { AppNotification } from '../Types/Notification_types';
import { mapNotification } from '../Types/Notification_types';
import * as notificationService from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

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

// Backed by the real Go backend now (see ../../services/notificationService.ts) — pulls the
// caller's notifications on mount and after every mutation, instead of reading/writing localStorage.
export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedID, setSelectedID] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const list = await notificationService.listMyNotifications();
      setNotifications(list.map(mapNotification));
    } catch {
      // Bell is best-effort UI — a failed refresh just leaves the previous list showing.
    }
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const markAsRead = async (notificationID: string) => {
    setNotifications((prev) => prev.map((n) => (n.notificationID === notificationID ? { ...n, isRead: true } : n)));
    try {
      await notificationService.markNotificationRead(notificationID);
    } catch {
      void reload(); // out of sync with the server — resync instead of leaving a stale optimistic update
    }
  };

  const handleInvitationAction = async (notificationID: string, status: 'accepted' | 'declined') => {
    try {
      await notificationService.respondToInvitation(notificationID, status === 'accepted');
      await reload(); // accepting also adds the caller to the team server-side — no local roster bookkeeping needed here
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to respond to invitation');
    }
  };

  // Remove the notification from the list (no confirm needed since it's a lightweight action that doesn't affect team data)
  const handleDeleteNotification = async (notificationID: string) => {
    setNotifications((prev) => prev.filter((n) => n.notificationID !== notificationID));
    try {
      await notificationService.deleteNotification(notificationID);
    } catch {
      void reload();
    }
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
          <ScrollBox sx={{ maxHeight: 420 }}>
            {notifications
              .slice()
              .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
              .map((n, idx) => (
                <Box key={n.notificationID}>
                  {idx > 0 && <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }} />}
                  <Box
                    onClick={() => {
                      void markAsRead(n.notificationID);
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

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteNotification(n.notificationID);
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
          onDelete={(id) => void handleDeleteNotification(id)}
          onInvitationAction={(id, status) => void handleInvitationAction(id, status)}
        />
      )}
    </>
  );
}
