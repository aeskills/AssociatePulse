import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const params = useParams();
  const trainers = useAppStore((s) => s.trainers);
  const userRole = useAppStore((s) => s.userRole);

  const isAdminAuth = localStorage.getItem('admin_authenticated') === 'true' || sessionStorage.getItem('admin_authenticated') === 'true';
  const trainerAuthId = localStorage.getItem('trainer_authenticated') || sessionStorage.getItem('trainer_authenticated');

  useEffect(() => {
    // Sync store role with sessionStorage tokens on mount / route change
    if (isAdminAuth && userRole !== 'admin') {
      useAppStore.setState({ userRole: 'admin', activeTrainerId: null });
    } else if (!isAdminAuth && trainerAuthId && userRole !== 'trainer') {
      useAppStore.setState({ userRole: 'trainer', activeTrainerId: trainerAuthId });
    }
  }, [isAdminAuth, trainerAuthId, userRole]);

  // 1. If no valid session exists, redirect to login screen
  if (!isAdminAuth && !trainerAuthId) {
    return <Navigate to="/" replace />;
  }

  // 2. If route requires Admin privilege (e.g. /admin) but user is not Admin
  if (requireAdmin && !isAdminAuth) {
    return <Navigate to="/" replace />;
  }

  // 3. If a Trainer is logged in (NOT Admin), enforce access control to ONLY their own workspace
  if (!isAdminAuth && trainerAuthId) {
    const routeTrainerId = params.trainerId;
    if (routeTrainerId && routeTrainerId !== trainerAuthId) {
      const myTrainer = trainers.find((t) => t.id === trainerAuthId);
      const myStateId = myTrainer?.stateId || 'up';
      return <Navigate to={`/dashboard/state/${myStateId}/trainer/${trainerAuthId}/daily-log`} replace />;
    }
  }

  return <>{children}</>;
}
