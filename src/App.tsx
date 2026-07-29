import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/ui/Toast';
import { cn } from './lib/utils';

/**
 * App layout shell containing side-by-side Sidebar + Main area panel.
 */
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell relative">
      {/* Floating mobile toggle button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 bg-slate-900/90 text-white p-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-colors border border-slate-700/50 backdrop-blur-sm cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
      >
        <Menu size={20} />
      </button>

      {/* Overlay behind drawer on mobile */}
      <div 
        className={cn("sidebar-overlay", sidebarOpen && "active")}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Right */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="main-content flex-1 flex flex-col min-w-0">
          <div className="flex-1 pb-24 lg:pb-8">
            <Outlet />
          </div>
        </div>
        <ToastContainer />
      </div>
    </div>
  );
}

