import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assignment from './pages/Assignment';
import Submission from './pages/Submission';
import Review from './pages/Review';
import GroupWork from './pages/GroupWork';
import GroupEditor from './pages/GroupEditor';
import NotFound from './pages/NotFound';

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
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/assignments/:id" element={<ProtectedRoute><Layout><Assignment /></Layout></ProtectedRoute>} />
          <Route path="/submissions/:id" element={<ProtectedRoute><Layout><Submission /></Layout></ProtectedRoute>} />
          <Route path="/review/:id" element={<ProtectedRoute><Layout><Review /></Layout></ProtectedRoute>} />
          <Route path="/group/:id" element={<ProtectedRoute><Layout><GroupWork /></Layout></ProtectedRoute>} />
          <Route path="/group/:groupId/edit" element={<ProtectedRoute><Layout><GroupEditor /></Layout></ProtectedRoute>} />
          <Route path="/join/:code" element={<ProtectedRoute><GroupWork /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}