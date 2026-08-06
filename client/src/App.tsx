import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Landing } from './pages/Landing.js';

// Layout wrapper for all protected routes
const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0F14] text-slate-100 relative">
      {/* Background HUD grid */}
      <div className="absolute inset-0 hud-grid opacity-[0.15] pointer-events-none z-0" />

      {/* Moving ambient blurred gradient circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full ambient-circle-1 pointer-events-none z-0" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full ambient-circle-2 pointer-events-none z-0" />

      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Navbar />
        <main className="flex-1 overflow-hidden flex flex-col bg-transparent">
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.985, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, scale: 0.985, filter: 'blur(6px)' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const { session, initialize } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
        <Route path="/" element={<Landing />} />
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
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
