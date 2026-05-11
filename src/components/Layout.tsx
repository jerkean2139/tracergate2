import { NavLink, Outlet } from 'react-router-dom';
import { Settings2, LayoutDashboard, CreditCard } from 'lucide-react';
import { getLocationId } from '../lib/api';

function navTo(path: string): string {
  const lid = getLocationId();
  return lid ? `${path}?locationId=${lid}` : path;
}

export default function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-olive/20 text-olive-light'
        : 'text-text-secondary hover:text-text-primary hover:bg-charcoal-light'
    }`;

  return (
    <div className="min-h-screen bg-charcoal text-text-primary">
      <header className="border-b border-charcoal-light">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-olive" />
            <span className="text-lg font-semibold">TracerGate</span>
          </div>
          <nav className="flex gap-1">
            <NavLink to={navTo('/')} end className={linkClass}>
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </NavLink>
            <NavLink to={navTo('/processors')} className={linkClass}>
              <CreditCard className="w-4 h-4" />
              Processors
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
