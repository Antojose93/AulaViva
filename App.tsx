import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/Auth/LoginPage';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { UnauthorizedPage } from './components/Auth/UnauthorizedPage';
import { StudentPage } from './components/StudentView/StudentPage';
import { MentorPage } from './components/MentorView/MentorPage';
import { FirebaseFirestoreService } from './services/firebaseFirestoreService';
import { BookOpen, Lock } from 'lucide-react';

/**
 * RootRedirect handles intelligent routing from root "/":
 * - If unauthenticated -> redirects to "/login"
 * - If authenticated as student -> redirects to "/student"
 * - If authenticated as mentor -> redirects to "/mentor"
 */
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-pulse">
            <BookOpen className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Lock className="w-3 h-3 text-slate-950" />
          </div>
        </div>
        <p className="text-sm text-slate-400 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Verificando sesión segura en Aula Viva...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'mentor' ? '/mentor' : '/student'} replace />;
}

/**
 * AppContent contains global background tasks such as seeding Firestore data.
 */
function AppContent() {
  const { firebaseUser, loading, user } = useAuth();
  const lastSeededUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !firebaseUser || !user?.id || lastSeededUserIdRef.current === firebaseUser.uid) {
      return;
    }

    lastSeededUserIdRef.current = firebaseUser.uid;
    FirebaseFirestoreService.seedInitialDataIfNeeded(user).catch((err) => {
      console.warn('Initial Firestore setup notice:', err);
    });
  }, [firebaseUser, loading, user]);

  return (
    <Routes>
      {/* 1. Public Authentication Entry Point */}
      <Route path="/login" element={<LoginPage />} />

      {/* 2. Protected Student Dashboard (Exclusive to role 'student') */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentPage />
          </ProtectedRoute>
        }
      />

      {/* 3. Protected Mentor Dashboard (Exclusive to role 'mentor') */}
      <Route
        path="/mentor"
        element={
          <ProtectedRoute allowedRoles={['mentor']}>
            <MentorPage />
          </ProtectedRoute>
        }
      />

      {/* 4. Unauthorized Access Page (403 Forbidden with recovery buttons) */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 5. Root Entry Point */}
      <Route path="/" element={<RootRedirect />} />

      {/* 6. Fallback Catch-all: Redirects to Root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
