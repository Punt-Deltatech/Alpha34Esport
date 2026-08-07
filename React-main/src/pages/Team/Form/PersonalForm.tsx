import { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Button,
  Avatar,
  Box,
  Typography,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import ChatIcon from '@mui/icons-material/Chat';
import type { Member, Portfolio } from '../../Types/Team_types';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PORTFOLIO_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Read an image file and convert it to a base64 data URL so it can be stored in localStorage
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Matches the TeamMember struct on the Go side
export interface PersonalForm {
  userID: string;
  fullname: string;
  gameUID: string;
  role: 'starter' | 'Substitute'; // Must match Member.role in Team_types.ts (fixed here — previously 'starter' | 'sub', which didn't match Member.role or the MenuItem below)
  phone: string;
  socialContact: string;
  position: 'Captain' | 'Member'; // Must not be edited manually — computed from isOwner
  avatar: string; // base64 data URL of the profile picture (can be empty)
  portfolio: Portfolio | null; // Attached file (resume/portfolio) — composition 0..1 with TeamMember
}

interface PersonalFormDialogProps {
  member: Member;
  isSelf: boolean;
  isCaptain: boolean;
  onClose: () => void;
  onSubmit: (data: PersonalForm) => void;
}

export function PersonalFormDialog({ member, isSelf, isCaptain, onClose, onSubmit }: PersonalFormDialogProps) {
  // position is calculated automatically from isOwner; users must not edit it
  const position: PersonalForm['position'] = member.isOwner ? 'Captain' : 'Member';

  const [form, setForm] = useState<PersonalForm>({
    userID: member.userid,
    fullname: member.name ?? '',
    gameUID: member.gameUID ?? '',
    role: (member.role as PersonalForm['role']) ?? 'Substitute',
    phone: member.phone ?? '',
    socialContact: member.socialContact ?? '',
    position,
    avatar: member.avatar ?? '',
    portfolio: member.portfolio ?? null,
  });
  const [avatarError, setAvatarError] = useState('');
  const [portfolioError, setPortfolioError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  // Only the captain can edit the role (starter/sub), whether their own or someone else's
  const canEditRole = isCaptain;
  // Contact/profile info can only be edited by the profile owner
  const canEditProfileFields = isSelf;

  const handleChange = (field: keyof PersonalForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Allow selecting the same file again
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file only');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Image file must not exceed 2MB');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarError('');
      setForm((prev) => ({ ...prev, avatar: dataUrl }));
    } catch {
      setAvatarError('Failed to upload image. Please try again.');
    }
  };

  const handleAvatarRemove = () => {
    setForm((prev) => ({ ...prev, avatar: '' }));
    setAvatarError('');
  };

  const handlePortfolioPick = () => portfolioInputRef.current?.click();

  const handlePortfolioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Allow selecting the same file again
    if (!file) return;

    if (file.size > MAX_PORTFOLIO_SIZE) {
      setPortfolioError('File must not exceed 10MB');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPortfolioError('');
      const newPortfolio: Portfolio = {
        fileID: `${member.userid}-${Date.now()}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileData: dataUrl,
      };
      setForm((prev) => ({ ...prev, portfolio: newPortfolio }));
    } catch {
      setPortfolioError('Failed to upload file. Please try again.');
    }
  };

  const handlePortfolioRemove = () => {
    setForm((prev) => ({ ...prev, portfolio: null }));
    setPortfolioError('');
  };

  const handleSubmit = () => {
    console.log('[PersonalForm] handleSubmit fired, form data:', form); // TODO: remove after debugging
    onSubmit(form);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Personal Information
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Profile Picture
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={form.avatar || undefined}
              variant="rounded"
              sx={{ width: 56, height: 56, bgcolor: 'divider' }}
            >
              <ImageIcon sx={{ color: 'text.secondary' }} />
            </Avatar>
            <Button
              size="small"
              variant="outlined"
              onClick={handleAvatarPick}
              disabled={!canEditProfileFields}
              sx={{ textTransform: 'none' }}
            >
              Upload Picture
            </Button>
            {form.avatar && (
              <Button
                size="small"
                color="error"
                onClick={handleAvatarRemove}
                disabled={!canEditProfileFields}
                sx={{ textTransform: 'none' }}
              >
                Remove Picture
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </Box>
          {avatarError && (
            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.75 }}>
              {avatarError}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Portfolio File (resume/portfolio — 1 file allowed)
          </Typography>

          {form.portfolio ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.25,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <AttachFileIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap title={form.portfolio.fileName}>
                  {form.portfolio.fileName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {form.portfolio.fileType} · {formatFileSize(form.portfolio.fileSize)}
                </Typography>
              </Box>
              {canEditProfileFields && (
                <Button size="small" color="error" onClick={handlePortfolioRemove} sx={{ textTransform: 'none' }}>
                  Remove File
                </Button>
              )}
            </Box>
          ) : (
            <Button
              size="small"
              variant="outlined"
              onClick={handlePortfolioPick}
              disabled={!canEditProfileFields}
              sx={{ textTransform: 'none' }}
            >
              Attach File
            </Button>
          )}
          <input
            ref={portfolioInputRef}
            type="file"
            onChange={handlePortfolioChange}
            style={{ display: 'none' }}
          />
          {portfolioError && (
            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.75 }}>
              {portfolioError}
            </Typography>
          )}
        </Box>

        <TextField
          label="Full Name"
          value={form.fullname}
          onChange={handleChange('fullname')}
          disabled={!canEditProfileFields}
          fullWidth
        />
        <TextField
          label="Game UID"
          value={form.gameUID}
          onChange={handleChange('gameUID')}
          disabled={!canEditProfileFields}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          label="Phone Number"
          value={form.phone}
          onChange={handleChange('phone')}
          disabled={!canEditProfileFields}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon sx={{ fontSize: 20, color: 'success.main' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          label="Contact Channel (Discord/Line/etc.)"
          value={form.socialContact}
          onChange={handleChange('socialContact')}
          disabled={!canEditProfileFields}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <ChatIcon sx={{ fontSize: 20, color: 'info.main' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* Role: starter/sub — only the captain can set this */}
        <TextField
          select
          label="Role"
          value={form.role}
          onChange={handleChange('role')}
          disabled={!canEditRole}
          helperText={!canEditRole ? 'Only the captain can set the Role' : ' '}
          fullWidth
        >
          <MenuItem value="starter">Starter</MenuItem>
          <MenuItem value="Substitute">Substitute</MenuItem>
        </TextField>

        {/* Position: calculated automatically, cannot be edited */}
        <TextField label="Position" value={form.position} disabled fullWidth helperText="Automatically set based on the team creator. Cannot be edited." />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} sx={{ textTransform: 'none', borderRadius: 2 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}