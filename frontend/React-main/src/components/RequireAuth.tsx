import { Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';

// Route guard: renders child routes only once a Supabase session exists,
// otherwise redirects to /login. Every page under Layout needs a session
// now that they call the real Go backend (which requires a bearer token).
export default function RequireAuth() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
}
