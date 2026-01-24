
import {
  Briefcase,
  Calculator,
  CalendarDays,
  FileText,
  Hammer,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Receipt,
  Settings,
  Sun,
  UserPlus,
  Wallet,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import QuickNotes from './QuickNotes';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/registrations', label: 'Cadastros e Leads', icon: UserPlus },
    { path: '/projects', label: 'Obras e Projetos', icon: Hammer },
    { path: '/schedule', label: 'Cronograma Obras', icon: CalendarDays },
    { path: '/calculator', label: 'Calculadora de Preços', icon: Calculator },
    { path: '/proposals', label: 'Propostas Comerciais', icon: FileText },
    { path: '/financial', label: 'Financeiro Obras', icon: Wallet },
    { path: '/receipts', label: 'Recibos Digitais', icon: Receipt },
    { path: '/services', label: 'Catálogo Serviços', icon: Briefcase },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun size={20} />;
    if (theme === 'dark') return <Moon size={20} />;
    return <Monitor size={20} />;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className={`min-h-screen flex ${effectiveTheme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100 dark:border-gray-800">
            <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">PrecificaPro</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X size={20} /></button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button key={item.path} onClick={() => handleNavigate(item.path)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-bold'}`}>
                  <Icon size={20} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                <span className="text-indigo-700 dark:text-indigo-400 font-black">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold truncate">{user?.name}</p>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{user?.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleTheme} className="flex-1 flex items-center justify-center p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300">{getThemeIcon()}</button>
              <button onClick={logout} className="flex items-center justify-center p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600"><LogOut size={20} /></button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"><Menu size={24} /></button>
          <div className="ml-4 font-black text-indigo-600 uppercase tracking-tighter">PrecificaPro</div>
        </header>
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      <QuickNotes />
    </div>
  );
};

export default Layout;
