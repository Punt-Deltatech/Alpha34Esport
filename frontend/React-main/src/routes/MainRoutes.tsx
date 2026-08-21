import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import RequireAuth from '../components/RequireAuth';
import SignIn from '../pages/Auth/SignIn';
import Dashboard from '../pages/Dashboard';
import MyTeam from '../pages/Team/GetStarted';
import TournamentHub from '../pages/Tournament/TournamentHub';
import RefereeReview from '../pages/Referee/RefereeReview';
import ReviewLogPage from '../pages/Referee/RefereeLog';

export default function MainRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="myteam" element={<MyTeam />} />
            <Route path="tournament" element={<TournamentHub />} />
            <Route path="referee" element={<RefereeReview />} />
            <Route path="referee/logs" element={<ReviewLogPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}