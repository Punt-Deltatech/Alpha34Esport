import { useState } from 'react';
import { Box, Card, Typography, TextField, Button, Alert, Tabs, Tab } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Minimal Supabase email/password sign-in/sign-up gate. Auth itself (Module 1) belongs to a
// teammate's part of the project — this page is only the unavoidable plumbing needed to get a
// session so the Team & Registration pages (this project's actual scope) have someone to act as.
export default function SignIn() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
        navigate('/', { replace: true });
      } else {
        await signUpWithPassword(email, password);
        setInfo('Account created — check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', p: 4 }}>
      <Card
        component="form"
        onSubmit={handleSubmit}
        sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 3, maxWidth: 400, width: '100%' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Sign in to 34Esport
        </Typography>

        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab value="signin" label="Sign In" sx={{ textTransform: 'none' }} />
          <Tab value="signup" label="Sign Up" sx={{ textTransform: 'none' }} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        <TextField
          fullWidth
          required
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          required
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2.5 }}
        />

        <Button type="submit" fullWidth variant="contained" disabled={submitting} sx={{ py: 1.2, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
          {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </Button>
      </Card>
    </Box>
  );
}
