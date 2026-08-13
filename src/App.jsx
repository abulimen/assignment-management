import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
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

// Route-level code splitting: the heavy pages (embedded editor, realtime
// collab, charts) are loaded on demand so the first-paint critical path stays
// small. The editor-vendor (yjs/@tiptap/@hocuspocus) and charts (recharts)
// chunks download only when the matching route is entered.
const Assignment = lazy(() => import('./pages/Assignment'));
const Submission = lazy(() => import('./pages/Submission'));
const Review = lazy(() => import('./pages/Review'));
const GroupEditor = lazy(() => import('./pages/GroupEditor'));

// Suspense wrapper used on the lazy routes (inside <Layout>).
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
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/assignments/:id" element={<ProtectedRoute><Layout><LazyPage><Assignment /></LazyPage></Layout></ProtectedRoute>} />
          <Route path="/submissions/:id" element={<ProtectedRoute><Layout><LazyPage><Submission /></LazyPage></Layout></ProtectedRoute>} />
          <Route path="/review/:id" element={<ProtectedRoute><Layout><LazyPage><Review /></LazyPage></Layout></ProtectedRoute>} />
          <Route path="/group/:id" element={<ProtectedRoute><Layout><GroupWork /></Layout></ProtectedRoute>} />
          <Route path="/group/:groupId/edit" element={<ProtectedRoute><Layout><LazyPage><GroupEditor /></LazyPage></Layout></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><GroupWork /></ProtectedRoute>} />
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}