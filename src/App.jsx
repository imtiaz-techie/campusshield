import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from './context/AuthContext';
import { PageLoader } from './components/ui';
import DashboardLayout from './layouts/DashboardLayout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

import StudentDashboard from './pages/student/StudentDashboard';
import ReportEmergency from './pages/student/ReportEmergency';
import EmergencyContacts from './pages/student/EmergencyContacts';
import Notifications from './pages/student/Notifications';
import Profile from './pages/shared/Profile';
import IncidentList from './pages/shared/IncidentList';
import IncidentDetail from './pages/shared/IncidentDetail';
import StaffDashboard from './pages/security/StaffDashboard';
import MapPage from './pages/security/MapPage';
import Analytics from './pages/security/Analytics';
import ContactAlerts from './pages/security/ContactAlerts';
import Users from './pages/admin/Users';
import Categories from './pages/admin/Categories';
import Settings from './pages/admin/Settings';

/** Requires login and one of the given roles; otherwise redirects. */
function Protected({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Restoring your session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <DashboardLayout />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to={homeFor(user.role)} replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      <Route element={<Protected roles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/profile" element={<Profile />} />
        <Route path="/student/emergency-contacts" element={<EmergencyContacts />} />
        <Route path="/student/report-emergency" element={<ReportEmergency />} />
        <Route path="/student/incidents" element={<IncidentList />} />
        <Route path="/student/incidents/:id" element={<IncidentDetail />} />
        <Route path="/student/notifications" element={<Notifications />} />
      </Route>

      <Route element={<Protected roles={['security']} />}>
        <Route path="/security/dashboard" element={<StaffDashboard />} />
        <Route path="/security/incidents" element={<IncidentList />} />
        <Route path="/security/incidents/:id" element={<IncidentDetail />} />
        <Route path="/security/map" element={<MapPage />} />
        <Route path="/security/analytics" element={<Analytics />} />
        <Route path="/security/notifications" element={<ContactAlerts />} />
        <Route path="/security/profile" element={<Profile />} />
      </Route>

      <Route element={<Protected roles={['admin']} />}>
        <Route path="/admin/dashboard" element={<StaffDashboard />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/incidents" element={<IncidentList />} />
        <Route path="/admin/incidents/:id" element={<IncidentDetail />} />
        <Route path="/admin/map" element={<MapPage />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
