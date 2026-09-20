import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { authService } from '../services/authService';
import type { Bid, UserProfile } from '../types';
import { bidService } from '../services/bidService';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeBid, setActiveBid] = useState<Bid | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Extract the active bid ID from any bid-scoped route.
  const pathMatch = location.pathname.match(/\/bids\/([^/]+)/);
  const activeBidId = pathMatch?.[1];

  useEffect(() => {
    const loadUser = async () => {
      if (!localStorage.getItem('gem_auth_token')) {
        navigate('/login');
        return;
      }
      try {
        const profile = await authService.getCurrentUser();
        setUser(profile);
      } catch {
        navigate('/login');
      }
    };
    loadUser();
  }, [navigate]);

  useEffect(() => {
    if (user?.role !== 'GOVERNMENT OFFICER' || !activeBidId) {
      return;
    }

    let cancelled = false;
    bidService.getBidById(activeBidId)
      .then((bid) => {
        if (!cancelled) setActiveBid(bid);
      })
      .catch(() => {
        if (!cancelled) setActiveBid(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBidId, user?.role]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex h-screen bg-slate-900 text-white items-center justify-center font-sans text-xs">
        Loading portal session...
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar 
        user={user} 
        activeBidId={activeBidId}
         activeBid={activeBidId ? activeBid : null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <div className="app-main flex flex-col">
        <Header user={user} onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="main-content">
            <Outlet context={{ user }} />
          </div>
        </main>
      </div>
    </div>
  );
};
