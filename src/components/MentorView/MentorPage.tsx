import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../Navbar';
import { MentorDashboard } from './MentorDashboard';
import { DocsModal } from '../DocsView/DocsModal';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';

export const MentorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    return FirebaseFirestoreService.subscribeToPendingSubmissions((pendingSubmissions) => {
      setPendingApprovalsCount(pendingSubmissions.length);
    });
  }, []);

  if (!user || user.role !== 'mentor') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar with Mentor context */}
      <Navbar
        currentUser={user}
        onOpenDocs={() => setShowDocsModal(true)}
        onLogout={handleLogout}
        isFirebaseConnected={true}
        pendingApprovalsCount={pendingApprovalsCount}
        studentUnreadCount={0}
      />

      {/* Main Mentor Dashboard */}
      <main className="flex-1 pb-12">
        <MentorDashboard onRefresh={forceUpdate} />
      </main>

      {/* Architecture & Blueprint Docs Modal */}
      {showDocsModal && <DocsModal onClose={() => setShowDocsModal(false)} />}
    </div>
  );
};
