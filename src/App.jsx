import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useContext, lazy, Suspense } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PageSkeleton from './components/PageSkeleton';
import GroupWork from './pages/GroupWork';
import NotFound from './pages/NotFound';
import Landing from './pages/Landing';

import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import { CookieNotice } from './components/CookieNotice';

import JoinCourse from './pages/JoinCourse';

// Route-level code splitting: the heavy pages (embedded editor, realtime
// collab, charts) are loaded on demand so the first-paint critical path stays
// small. The editor-vendor (yjs/@tiptap/@hocuspocus) and charts (recharts)
// chunks download only when the matching route is entered.
const CourseHub = lazy(() => import('./pages/CourseHub'));
const Assignment = lazy(() => import('./pages/Assignment'));
const Submission = lazy(() => import('./pages/Submission'));
const Review = lazy(() => import('./pages/Review'));
const GroupEditor = lazy(() => import('./pages/GroupEditor'));
const Profile = lazy(() => import('./pages/Profile'));

// Suspense wrapper used on the lazy routes.
const LazyPage = ({ children }) => (
  <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
);

function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!token) return <Navigate to="/login" />;
  return children;
}

function PublicRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return null;
  if (token) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Public Legal Pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />

            {/* Standard Portal Pages with Global Layout */}
            <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Layout><LazyPage><Profile /></LazyPage></Layout></ProtectedRoute>} />
            <Route path="/courses/:id" element={<ProtectedRoute><Layout><LazyPage><CourseHub /></LazyPage></Layout></ProtectedRoute>} />
            <Route path="/assignments/:id" element={<ProtectedRoute><Layout><LazyPage><Assignment /></LazyPage></Layout></ProtectedRoute>} />
            <Route path="/group/:id" element={<ProtectedRoute><Layout><GroupWork /></Layout></ProtectedRoute>} />
            
            {/* Full-Screen Standalone Workspaces (No Outer Layout Wrapper) */}
            <Route path="/submissions/:id" element={<ProtectedRoute><LazyPage><Submission /></LazyPage></ProtectedRoute>} />
            <Route path="/group/:groupId/edit" element={<ProtectedRoute><LazyPage><GroupEditor /></LazyPage></ProtectedRoute>} />
            <Route path="/review/:id" element={<ProtectedRoute><LazyPage><Review /></LazyPage></ProtectedRoute>} />
            
            <Route path="/join/course/:code" element={<JoinCourse />} />
            <Route path="/join/:code" element={<ProtectedRoute><GroupWork /></ProtectedRoute>} />
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieNotice />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}