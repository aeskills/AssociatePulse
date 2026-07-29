import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import TrainerWorkspace from './pages/workspace/TrainerWorkspace';
import DailyLogTab from './pages/workspace/DailyLogTab';
import SchoolDetailsTab from './pages/workspace/SchoolDetailsTab';
import MonthlyCalendarTab from './pages/workspace/MonthlyCalendarTab';
import ProtectedRoute from './components/auth/ProtectedRoute';
import './index.css';

// Purge legacy local memory cache keys to enforce pure UI-GSheet synchronization
try {
  ['trainer-pulse-v7', 'trainer-pulse-v6', 'trainer-pulse-v5', 'trainer-pulse-v4'].forEach(key => {
    localStorage.removeItem(key);
  });
} catch (e) {}

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/admin',
    element: <AdminDashboard />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="state/up/trainer/t-manish/daily-log" replace />
      },
      {
        path: 'state/:stateId',
        element: <Navigate to="trainer/t-manish/daily-log" replace />
      },
      {
        path: 'state/:stateId/trainer/:trainerId',
        element: <TrainerWorkspace />,
        children: [
          {
            index: true,
            element: <Navigate to="daily-log" replace />
          },
          {
            path: 'daily-log',
            element: <DailyLogTab />
          },
          {
            path: 'attendance',
            element: <Navigate to="../daily-log" replace />
          },
          {
            path: 'visits',
            element: <Navigate to="../daily-log" replace />
          },
          {
            path: 'feedback',
            element: <Navigate to="../daily-log" replace />
          },
          {
            path: 'schools',
            element: <SchoolDetailsTab />
          },
          {
            path: 'calendar',
            element: <MonthlyCalendarTab />
          }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
