import { Menu } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  return (
    <header className="topbar">
      
      {/* Left side: Hamburger (mobile) */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button 
          className="hamburger-btn"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right side actions */}
      <div className="topbar-right flex items-center gap-4">
        <Breadcrumbs />
      </div>
    </header>
  );
}


