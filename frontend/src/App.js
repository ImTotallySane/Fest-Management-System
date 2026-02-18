import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import EventRegister from './pages/EventRegister';
import ClubsOrganizers from './pages/ClubsOrganizers';
import OrganizerPublicDetail from './pages/OrganizerPublicDetail';
import Profile from './pages/Profile';
import OrganizerDashboard from './pages/OrganizerDashboard';
import CreateEvent from './pages/CreateEvent';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import OrganizerProfile from './pages/OrganizerProfile';
import ParticipantInterests from './pages/ParticipantInterests';
import OnboardingClubs from './pages/OnboardingClubs';
import TeamManagement from './pages/TeamManagement';
import OrganizerFeedbackView from './pages/OrganizerFeedbackView';
import SearchEvents from './pages/SearchEvents';
import RoleRoute from './components/RoleRoute';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />

        <Route
          path="/participant/onboarding/interests"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <ParticipantInterests />
            </RoleRoute>
          }
        />

        <Route
          path="/participant/onboarding/clubs"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <OnboardingClubs />
            </RoleRoute>
          }
        />

        <Route
          path="/participant/dashboard"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <ParticipantDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/browse"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <BrowseEvents />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/search"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <SearchEvents />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/events/:id"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <EventDetails />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/events/:id/register"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <EventRegister />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/clubs"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <ClubsOrganizers />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/organizers/:id"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <OrganizerPublicDetail />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/profile"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <Profile />
            </RoleRoute>
          }
        />
        <Route
          path="/participant/teams"
          element={
            <RoleRoute allowedRoles={['participant']}>
              <TeamManagement />
            </RoleRoute>
          }
        />

        <Route
          path="/organizer/dashboard"
          element={
            <RoleRoute allowedRoles={['organizer']}>
              <OrganizerDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/organizer/create-event"
          element={
            <RoleRoute allowedRoles={['organizer']}>
              <CreateEvent />
            </RoleRoute>
          }
        />
        <Route
          path="/organizer/events/:id"
          element={
            <RoleRoute allowedRoles={['organizer']}>
              <OrganizerEventDetail />
            </RoleRoute>
          }
        />
        <Route
          path="/organizer/profile"
          element={
            <RoleRoute allowedRoles={['organizer']}>
              <OrganizerProfile />
            </RoleRoute>
          }
        />
        <Route
          path="/organizer/events/:eventId/feedback"
          element={
            <RoleRoute allowedRoles={['organizer']}>
              <OrganizerFeedbackView />
            </RoleRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <RoleRoute allowedRoles={['participant', 'organizer']}>
              <Profile />
            </RoleRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;