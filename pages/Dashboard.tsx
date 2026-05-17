
import {
   Activity,
   AlertTriangle,
   Briefcase,
   Calculator,
   CalendarDays,
   ChevronRight,
   FileText,
   Hammer,
   PieChart,
   Plus,
   Receipt,
   TrendingUp,
   UserPlus,
   Users,
   Wallet
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

// Módulos do sistema com ícones
const modules = [
   { label: 'Cadastros', icon: UserPlus, path: '/registrations', color: 'bg-violet-500', lightBg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400' },
   { label: 'Obras', icon: Hammer, path: '/projects', color: 'bg-teal-500', lightBg: 'bg-teal-50 dark:bg-teal-900/20', iconColor: 'text-teal-600 dark:text-teal-400' },
   { label: 'Cronograma', icon: CalendarDays, path: '/schedule', color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
   { label: 'Calculadora', icon: Calculator, path: '/calculator', color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
   { label: 'Propostas', icon: FileText, path: '/proposals', color: 'bg-sky-500', lightBg: 'bg-sky-50 dark:bg-sky-900/20', iconColor: 'text-sky-600 dark:text-sky-400' },
   { label: 'Financeiro', icon: Wallet, path: '/financial', color: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
   { label: 'Recibos', icon: Receipt, path: '/receipts', color: 'bg-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-900/20', iconColor: 'text-rose-600 dark:text-rose-400' },
   { label: 'Catálogo', icon: Briefcase, path: '/services', color: 'bg-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-900/20', iconColor: 'text-indigo-600 dark:text-indigo-400' },
];

const Dashboard: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [projects, setProjects] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [totalReceita, setTotalReceita] = useState(0);
   const [totalGastos, setTotalGastos] = useState(0);
   const [proposalCount, setProposalCount] = useState(0);
   const [recentProposals, setRecentProposals] = useState<any[]>([]);

   useEffect(() => {
      if (user) fetchDashboardData();
   }, [user]);

   const fetchDashboardData = async () => {
      setLoading(true);
      const { data: projectsData } = await supabase
         .from('projects')
         .select('*, clients (nome)')
         .order('created_at', { ascending: false })
         .limit(3);

      if (projectsData) {
         setProjects(projectsData.map(p => ({
            id: p.id,
            name: p.name,
            client: p.clients?.nome || 'Geral',
            budget: Number(p.total_budget),
            spent: Number(p.spent_amount),
            progress: p.total_budget > 0 ? Math.round((Number(p.spent_amount) / Number(p.total_budget)) * 100) : 0,
            status: Number(p.spent_amount) > Number(p.total_budget) ? 'warning' : 'active'
         })));
         setTotalReceita(projectsData.reduce((a, p) => a + Number(p.total_budget), 0));
         setTotalGastos(projectsData.reduce((a, p) => a + Number(p.spent_amount), 0));
      }

      const { count } = await supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'draft');
      const { data: proposalsData } = await supabase.from('proposals').select('*').order('created_at', { ascending: false }).limit(3);
      setProposalCount(count || 0);
      if (proposalsData) setRecentProposals(proposalsData);
      setLoading(false);
   };

   const firstName = user?.name?.split(' ')[0] || 'Usuário';
   const initials = user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

   return (
      <div className="pb-20 animate-in fade-in duration-500">

         {/* ── Header do usuário ── */}
         <div className="bg-gradient-to-br from-teal-600 to-emerald-600 rounded-3xl p-6 mb-6 shadow-xl shadow-teal-600/20 relative overflow-hidden">
            {/* Círculos decorativos */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between">
               <div>
                  <p className="text-teal-100 text-sm font-medium">Olá,</p>
                  <h1 className="text-2xl font-black text-white">{firstName}</h1>
                  <p className="text-teal-200 text-xs font-medium mt-0.5 uppercase tracking-wider">{user?.role || 'Arquiteto / Engenheiro'}</p>
               </div>
               <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/30 shadow-lg">
                  <span className="text-white font-black text-xl">{initials}</span>
               </div>
            </div>

            {/* Mini stats */}
            <div className="relative grid grid-cols-3 gap-3 mt-5">
               <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                  <p className="text-white font-black text-lg leading-none">{projects.length}</p>
                  <p className="text-teal-100 text-[10px] font-bold mt-1 uppercase tracking-wide">Obras</p>
               </div>
               <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                  <p className="text-white font-black text-lg leading-none">{proposalCount}</p>
                  <p className="text-teal-100 text-[10px] font-bold mt-1 uppercase tracking-wide">Propostas</p>
               </div>
               <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                  <p className="text-white font-black text-base leading-none">
                     {totalReceita > 0 ? `${Math.round((totalGastos / totalReceita) * 100)}%` : '0%'}
                  </p>
                  <p className="text-teal-100 text-[10px] font-bold mt-1 uppercase tracking-wide">Exec.</p>
               </div>
            </div>
         </div>

         {/* ── Módulos (grid de ícones) ── */}
         <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Módulos</h2>
               <button
                  onClick={() => navigate('/projects')}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:gap-2 transition-all"
               >
                  Ver obras <ChevronRight size={14} />
               </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
               {modules.map((mod, i) => {
                  const Icon = mod.icon;
                  return (
                     <button
                        key={mod.path}
                        onClick={() => navigate(mod.path)}
                        className="flex flex-col items-center gap-2 group active:scale-90 transition-transform duration-150"
                        style={{ animationDelay: `${i * 40}ms` }}
                     >
                        <div className={`w-14 h-14 rounded-2xl ${mod.lightBg} flex items-center justify-center shadow-sm group-hover:shadow-md group-active:shadow-none transition-all duration-200`}>
                           <Icon size={24} className={mod.iconColor} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">{mod.label}</span>
                     </button>
                  );
               })}
            </div>
         </div>

         {/* ── Resumo Financeiro ── */}
         <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                     <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Receita</p>
               </div>
               <p className="text-xl font-black text-gray-900 dark:text-white">
                  {loading ? '...' : `R$ ${totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
               </p>
               <p className="text-[10px] text-emerald-600 font-bold mt-1">Em execução</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
                     <Activity size={16} className="text-orange-600" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Gastos</p>
               </div>
               <p className="text-xl font-black text-gray-900 dark:text-white">
                  {loading ? '...' : `R$ ${totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
               </p>
               <p className="text-[10px] text-orange-500 font-bold mt-1">Consolidado</p>
            </div>
         </div>

         {/* ── Obras Recentes ── */}
         {projects.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                     <Hammer size={16} className="text-teal-600" /> Obras Recentes
                  </h2>
                  <button onClick={() => navigate('/projects')} className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                     Ver todas <ChevronRight size={14} />
                  </button>
               </div>
               <div className="space-y-3">
                  {projects.map(project => (
                     <div
                        key={project.id}
                        onClick={() => navigate('/projects')}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                     >
                        {project.status === 'warning' ? (
                           <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center shrink-0">
                              <AlertTriangle size={18} className="text-rose-500" />
                           </div>
                        ) : (
                           <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center shrink-0">
                              <Hammer size={18} className="text-teal-600" />
                           </div>
                        )}
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-black text-gray-900 dark:text-white truncate">{project.name}</p>
                           <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">{project.client}</p>
                           {/* Barra de progresso */}
                           <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                 className={`h-full rounded-full transition-all duration-700 ${project.status === 'warning' ? 'bg-rose-500' : 'bg-teal-500'}`}
                                 style={{ width: `${Math.min(project.progress, 100)}%` }}
                              />
                           </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-sm font-black text-gray-900 dark:text-white">{project.progress}%</p>
                           <p className="text-[10px] text-gray-400 font-medium">exec.</p>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* ── Propostas Recentes ── */}
         {recentProposals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                     <FileText size={16} className="text-blue-500" /> Propostas Recentes
                  </h2>
                  <button onClick={() => navigate('/proposals')} className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                     Ver todas <ChevronRight size={14} />
                  </button>
               </div>
               <div className="space-y-3">
                  {recentProposals.map((p: any, i: number) => (
                     <div
                        key={p.id}
                        onClick={() => navigate('/proposals')}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl cursor-pointer active:scale-[0.98] transition-transform"
                     >
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                           #{p.proposal_number?.split('/')[1] || (i + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-black text-gray-900 dark:text-white capitalize truncate">{p.client_name}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">R$ {Number(p.total_amount).toLocaleString('pt-BR')}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                           p.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                           p.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                           'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                           {p.status === 'approved' ? 'Aprovado' : p.status === 'sent' ? 'Enviado' : 'Rascunho'}
                        </span>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {/* ── FAB - Ação rápida ── */}
         <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-40">
            <button
               onClick={() => navigate('/calculator')}
               className="flex items-center gap-3 bg-teal-600 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-teal-600/40 font-black text-sm active:scale-95 transition-all hover:bg-teal-700"
            >
               <Plus size={20} />
               Nova Estimativa
            </button>
         </div>

         {/* ── Estado vazio ── */}
         {!loading && projects.length === 0 && recentProposals.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
               <div className="w-20 h-20 bg-teal-50 dark:bg-teal-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <PieChart size={36} className="text-teal-400" />
               </div>
               <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Bem-vindo ao PrecificaPro!</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
                  Comece criando seu primeiro cliente ou lançando uma estimativa de obra.
               </p>
               <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => navigate('/registrations')} className="px-5 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                     Adicionar Cliente
                  </button>
                  <button onClick={() => navigate('/calculator')} className="px-5 py-3 bg-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-colors flex items-center gap-2">
                     <Plus size={14} /> Nova Estimativa
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default Dashboard;
