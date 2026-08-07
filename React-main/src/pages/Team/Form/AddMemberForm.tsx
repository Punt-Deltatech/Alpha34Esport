import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BadgeIcon from '@mui/icons-material/Badge';
import MailIcon from '@mui/icons-material/Mail';
import type { Member } from '../../Types/Team_types';
import { sendTeamInvitation } from '../../Types/Notification_types';

interface AddMemberFormProps {
  teamName: string; // Used to name the invitation (and as a temporary inviterTeamID, since Team doesn't have a real teamID yet)
  existingMembers: Member[];
  onClose: () => void;
}

export default function AddMemberForm({ teamName, existingMembers, onClose }: AddMemberFormProps) {
  // There's no real search/login system yet, so the captain enters the UserID of the player to invite manually
  const [userID, setUserID] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null); // Has a value = invitation sent successfully; show the confirmation screen instead of the form

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedID = userID.trim();

    if (!trimmedID) {
      setError('Please enter a User ID');
      return;
    }
    if (existingMembers.some((m) => m.userid === trimmedID)) {
      setError('This User ID is already in the team');
      return;
    }

    // Invite to the team instead of adding immediately — sent as an InvitationNotification to the notification bell
    // The invitee must click "Accept" before they're actually considered part of the team
    sendTeamInvitation(teamName, trimmedID);
    setSentTo(trimmedID);
  };

  if (sentTo) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, py: 5 }}
        >
          <MailIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Invitation Sent
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            The team invitation has been sent to the notification bell of User ID "{sentTo}". Waiting for the player to accept.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none', borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Invite Member to Team
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Enter the User ID of the player you want to invite to the team. The system will send the invitation to that player's notification bell.
          </Typography>

          <TextField
            fullWidth
            required
            autoFocus
            label="User ID"
            value={userID}
            onChange={(e) => {
              setUserID(e.target.value);
              setError('');
            }}
            placeholder="e.g. user_1234"
            slotProps={{
              input: {
                startAdornment: <BadgeIcon sx={{ fontSize: 20, color: 'primary.main', mr: 1 }} />,
              },
            }}
          />

          {error && (
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }}>
            Send Invitation
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}