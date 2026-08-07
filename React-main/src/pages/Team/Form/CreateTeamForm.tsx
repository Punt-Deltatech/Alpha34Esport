import { useRef, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  MenuItem,
  Button,
  Avatar,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';

interface CreateTeamFormProps {
  onClose: () => void;
  onCreate: (team: any) => void;
}

const GAMES = ['VALORANT', 'League of Legends', 'ROV', 'PUBG Mobile', 'Free Fire'];

export default function CreateTeamForm({ onClose, onCreate }: CreateTeamFormProps) {
  const [name, setName] = useState('');
  const [game, setGame] = useState(GAMES[0]);
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
  const [social, setSocial] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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

    const team = {
      name: name.trim(),
      game,
      description: description.trim(),
      maxMembers,
      social: social.trim(),
      logo: logoUrl.trim(),
      members: [
        {
          id: '1',
          name: ownerName.trim() || 'You',
          role: 'starter',
          isOwner: true,
        },
      ],
    };

    localStorage.setItem('esports_team', JSON.stringify(team));
    onCreate(team);
  };

  return (
    <Card
      component="form"
      onSubmit={handleSubmit}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: 3,
        maxWidth: 440,
        width: '100%',
        boxShadow: 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Create Your Team
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Logo Upload */}
      <Box sx={{ mb: 2.5 }}>
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
        sx={{ mb: 2.5 }}
      />

      <TextField
        fullWidth
        select
        size="small"
        label="Game"
        value={game}
        onChange={(e) => setGame(e.target.value)}
        sx={{ mb: 2.5 }}
      >
        {GAMES.map((g) => (
          <MenuItem key={g} value={g}>{g}</MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        size="small"
        label="Your Name (Captain)"
        value={ownerName}
        onChange={(e) => setOwnerName(e.target.value)}
        placeholder="e.g. Punt Tong"
        sx={{ mb: 2.5 }}
      />

      <TextField
        fullWidth
        required
        type="number"
        size="small"
        label="Max Members"
        value={maxMembers}
        onChange={(e) => setMaxMembers(Number(e.target.value))}
        slotProps={{ htmlInput: { min: 1, max: 20 } }}
        sx={{ mb: 2.5 }}
      />

      <TextField
        fullWidth
        size="small"
        label="Social (optional)"
        value={social}
        onChange={(e) => setSocial(e.target.value)}
        placeholder="e.g. Discord: 34esport#1234 or facebook.com/34esport"
        sx={{ mb: 2.5 }}
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
        sx={{ mb: 2.5 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        color="primary"
        sx={{ py: 1.2, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
      >
        Save
      </Button>
    </Card>
  );
}