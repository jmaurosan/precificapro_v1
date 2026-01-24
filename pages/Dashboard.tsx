
import {
   Activity,
   AlertTriangle,
   ArrowUpRight,
   Calculator,
   ChevronRight,
   FileText,
   Hammer,
   PieChart,
   Plus,
   TrendingUp,
   Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const MOCK_PROJECTS = [
   { id: 'p1', name: 'Apartamento Granja Viana', client: 'Mauro Silva', budget: 45000, spent: 12450, progress: 28, status: 'active' },
   { id: 'p2', name: 'Residência Alphaville', client: 'Ana Paula', budget: 120000, spent: 85000, progress: 70, status: 'active' },
   { id: 'p3', name: 'Loja Shopping Center', client: 'Grupo Moda', budget: 35000, spent: 38000, progress: 100, status: 'warning' },
];

const Dashboard: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [projects, setProjects] = useState<any[]>([]);
   const [stats, setStats] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (user) {
         fetchDashboardData();
      }
   }, [user]);

   const fetchDashboardData = async () => {
      setLoading(true);
      const { data: projectsData } = await supabase
         .from('projects')
         .select(`
            *,
            clients (nome)
         `)
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
      }

      const totalRevenue = projectsData?.reduce((acc, p) => acc + Number(p.total_budget), 0) || 0;
      const totalExpenses = projectsData?.reduce((acc, p) => acc + Number(p.spent_amount), 0) || 0;

      const { count: proposalsCount } = await supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('status', 'draft');

      setStats([
         { label: 'Receita em Execução', value: `R$ ${totalRevenue.toLocaleString('pt-BR')}`, change: '+12%', icon: TrendingUp, color: 'emerald' },
         { label: 'Propostas em Aberto', value: String(proposalsCount || 0), change: 'Aguardando Aprovação', icon: FileText, color: 'blue' },
         { label: 'Obras Ativas', value: String(projectsData?.length || 0), change: 'No portfólio', icon: Users, color: 'cyan' },
         { label: 'Gastos Totais', value: `R$ ${totalExpenses.toLocaleString('pt-BR')}`, change: 'Consolidado', icon: Activity, color: 'orange' },
      ]);
      setLoading(false);
   };

   return (
      <div className="space-y-10 pb-12 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
               <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Escritório PrecificaPro</h1>
               <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Gestão consolidada de portfólio e performance por projeto.</p>
            </div>
            <div className="flex gap-3">
               <button onClick={() => navigate('/projects')} className="px-6 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">Ver Todas as Obras</button>
               <button onClick={() => navigate('/calculator')} className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2">
                  <Plus size={16} /> Nova Obra
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
               <div key={i} className="bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 flex items-center justify-center text-${stat.color}-600 mb-4`}>
                     <stat.icon size={24} />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stat.value}</h3>
                  <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                     <ArrowUpRight size={12} /> {stat.change}
                  </p>
               </div>
            ))}
         </div>

         <div className="space-y-6">
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 px-2">
               <Hammer size={22} className="text-indigo-600" /> Saúde dos Projetos em Execução
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {projects.map(project => (
                  <div
                     key={project.id}
                     onClick={() => navigate(`/projects`)}
                     className="group bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                  >
                     {project.status === 'warning' && (
                        <div className="absolute top-0 right-0 p-6">
                           <AlertTriangle className="text-rose-500 animate-pulse" size={24} />
                        </div>
                     )}
                     <div className="mb-6">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">{project.client}</p>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{project.name}</h3>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                           <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Executado</p>
                              <p className="text-lg font-black text-gray-900 dark:text-white">R$ {project.spent.toLocaleString('pt-BR')}</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget</p>
                              <p className="text-sm font-bold text-gray-500">R$ {project.budget.toLocaleString('pt-BR')}</p>
                           </div>
                        </div>

                        <div className="relative h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                           <div
                              className={`h-full transition-all duration-1000 rounded-full ${project.spent > project.budget ? 'bg-rose-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min((project.spent / project.budget) * 100, 100)}%` }}
                           />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                           <div className="flex items-center gap-2">
                              <PieChart size={14} className="text-gray-400" />
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{project.progress}% Concluído</span>
                           </div>
                           <div className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase">
                              Acessar Obra <ChevronRight size={16} />
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><FileText size={20} className="text-blue-500" /> Propostas Ativas</h3>
               </div>
               <div className="space-y-4">
                  {[1, 2].map(i => (
                     <div key={i} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-transparent hover:border-blue-100 transition-all cursor-pointer" onClick={() => navigate('/proposals')}>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">#0{i}</div>
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">Proposta Automação</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Vínculo: Projeto Alpha</p>
                           </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                     </div>
                  ))}
               </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Calculator size={20} className="text-emerald-500" /> Cálculos Rápidos</h3>
               </div>
               <div className="space-y-4">
                  {[1, 2].map(i => (
                     <div key={i} className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-transparent hover:border-emerald-100 transition-all cursor-pointer" onClick={() => navigate('/calculator')}>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black"><Calculator size={18} /></div>
                           <div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">Estimativa Técnica {i}</p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Modo: Composição</p>
                           </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300" />
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dashboard;
