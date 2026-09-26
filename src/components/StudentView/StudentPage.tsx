import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../Navbar';
import { StudentDashboard } from './StudentDashboard';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import { DocsModal } from '../DocsView/DocsModal';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';

export const StudentPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);

  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    return FirebaseFirestoreService.subscribeToUnreadNotificationsCount(user.id, setStudentUnreadCount);
  }, [user?.id]);

  if (!user || user.role !== 'student') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar with Student context */}
      <Navbar
        currentUser={user}
        onOpenDocs={() => setShowDocsModal(true)}
        onLogout={handleLogout}
        isFirebaseConnected={true}
        pendingApprovalsCount={0}
        studentUnreadCount={studentUnreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
      />

      {/* Main Student Dashboard */}
      <main className="flex-1 pb-12">
        <StudentDashboard user={user} onRefresh={forceUpdate} />
      </main>

      {/* Architecture & Blueprint Docs Modal */}
      {showDocsModal && <DocsModal onClose={() => setShowDocsModal(false)} />}

      {/* Student Notifications Modal */}
      {showNotifications && (
        <NotificationsCenterModal
          user={user}
          onClose={() => setShowNotifications(false)}
          onSelectMission={(missionId) => {
            setShowNotifications(false);
            setTimeout(() => {
              const el = document.getElementById(`mission-${missionId}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 150);
          }}
          onOpenMentorMessage={() => {
            setShowNotifications(false);
          }}
          onRefresh={forceUpdate}
        />
      )}
    </div>
  );
};
