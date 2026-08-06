import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useSocketStore } from './store/socketStore.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Sidebar } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Inbox } from './pages/Inbox.js';
import { Pipeline } from './pages/Pipeline.js';
import { Portfolio } from './pages/Portfolio.js';
import { Settings } from './pages/Settings.js';
import { PublicPortfolio } from './pages/PublicPortfolio.js';

// Layout wrapper for all protected routes
const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { session, initialize } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();

  // Initialize auth state
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Connect socket.io client once session token is verified
  useEffect(() => {
    if (session?.access_token) {
      connectSocket(session.access_token);
    } else {
      disconnectSocket();
    }
  }, [session, connectSocket, disconnectSocket]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/portfolio/:slug" element={<PublicPortfolio />} />

        {/* Protected Hub Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
