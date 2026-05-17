
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
    { path: '/', label: 'Painel Geral', icon: LayoutDashboard },
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
    <div className={`min-h-screen flex ${effectiveTheme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      {/* Backdrop com blur premium */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-20 lg:hidden backdrop-blur-md animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Premium */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 shadow-xl lg:shadow-none transform transition-all duration-500 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Header com gradiente */}
          <div className="relative flex items-center justify-between h-20 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                <span className="text-white font-black text-lg">P</span>
              </div>
              <h1 className="text-xl font-black text-gradient-primary">PrecificaPro</h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Fechar menu"
              className="lg:hidden p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navegação Premium */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden animate-slide-up ${isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold shadow-lg shadow-teal-500/30 scale-[1.02]'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-semibold hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Glow effect no hover */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}

                  <Icon
                    size={20}
                    className={`relative z-10 transition-transform duration-300 ${isActive
                      ? 'text-white'
                      : 'text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:scale-110'
                      }`}
                  />
                  <span className="text-sm relative z-10">{item.label}</span>

                  {/* Indicador ativo */}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Premium */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 px-3 py-3 mb-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-md">
                <span className="text-white font-black text-lg">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{user?.role}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                aria-label={`Alternar tema. Tema atual: ${theme}`}
                className="flex-1 flex items-center justify-center p-3 bg-white dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {getThemeIcon()}
              </button>
              <button
                onClick={logout}
                aria-label="Sair da conta"
                className="flex items-center justify-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header Mobile Premium */}
        <header className="lg:hidden h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 sticky top-0 z-10 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Menu size={24} />
          </button>
          <div className="ml-4 font-black text-gradient-primary uppercase tracking-tight text-lg">PrecificaPro</div>
        </header>

        {/* Área de Conteúdo com Background Mesh Sutil */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto bg-mesh">
          <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
        </main>
      </div>

      <QuickNotes />
    </div>
  );
};

export default Layout;
