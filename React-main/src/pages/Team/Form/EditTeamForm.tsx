import { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Avatar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import type { Team } from '../../Types/Team_types';

interface EditTeamFormProps {
  team: Team;
  onClose: () => void;
  onSave: (updates: Pick<Team, 'name' | 'game' | 'description' | 'maxMembers' | 'social' | 'logo'>) => void;
}

const GAMES = ['VALORANT', 'League of Legends', 'ROV', 'PUBG Mobile', 'Free Fire'];

export default function EditTeamForm({ team, onClose, onSave }: EditTeamFormProps) {
  // แก้เฉพาะข้อมูลทีม ไม่แตะ members — คนละส่วนกับ "กรอกข้อมูลส่วนตัว"
  const [name, setName] = useState(team.name);
  const [game, setGame] = useState(team.game);
  const [description, setDescription] = useState(team.description);
  const [maxMembers, setMaxMembers] = useState(team.maxMembers ?? 5);
  const [social, setSocial] = useState(team.social);
  const [logoUrl, setLogoUrl] = useState(team.logo ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      game,
      description: description.trim(),
      maxMembers,
      social: social.trim(),
      logo: logoUrl.trim(),
    });
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Edit Team
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Logo Upload */}
          <Box>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
              Team Logo (optional)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                src={logoUrl || undefined}
                variant="rounded"
                onClick={() => fileInputRef.current?.click()}
                sx={{ width: 48, height: 48, bgcolor: 'divider', flexShrink: 0, cursor: 'pointer' }}
              >
                <ImageIcon sx={{ color: 'text.secondary' }} />
              </Avatar>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {logoUrl ? 'Change Image' : 'Browse...'}
              </Button>
              {logoUrl && (
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    setLogoUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Remove
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: 'none' }}
              />
            </Box>
          </Box>

          <TextField
            fullWidth
            required
            size="small"
            label="Team Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 34Esport Alpha"
          />

          <TextField
            fullWidth
            select
            size="small"
            label="Game"
            value={game}
            onChange={(e) => setGame(e.target.value)}
          >
            {GAMES.map((g) => (
              <MenuItem key={g} value={g}>{g}</MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            required
            type="number"
            size="small"
            label="Max Members"
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            slotProps={{ htmlInput: { min: team.members.length, max: 20 } }}
            helperText={`Must be at least the current member count (${team.members.length})`}
          />

          <TextField
            fullWidth
            size="small"
            label="Social (optional)"
            value={social}
            onChange={(e) => setSocial(e.target.value)}
            placeholder="e.g. Discord: 34esport#1234 or facebook.com/34esport"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us about your team..."
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }}>
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}