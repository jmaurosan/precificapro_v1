
import {
   Activity,
   AlertTriangle,
   Briefcase,
   Calculator,
   CalendarDays,
   ChevronRight,
   FileText,
   Hammer,
   MessageCircle,
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
import { createWhatsappLink } from '../utils/whatsapp';

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
   const [clients, setClients] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [totalReceita, setTotalReceita] = useState(0);
   const [totalGastos, setTotalGastos] = useState(0);
   const [proposalCount, setProposalCount] = useState(0);
   const [recentProposals, setRecentProposals] = useState<any[]>([]);
   const [operationalAlerts, setOperationalAlerts] = useState<any[]>([]);
   const [commercialStats, setCommercialStats] = useState({
      totalLeads: 0,
      leadsNovo: 0,
      emBriefing: 0,
      propostasEnviadas: 0,
      contratados: 0,
      perdidos: 0,
      valorPropostasAbertas: 0,
      valorAprovado: 0,
      conversao: 0,
   });

   useEffect(() => {
      if (user) fetchDashboardData();
   }, [user]);

   const fetchDashboardData = async () => {
      setLoading(true);
      const { data: clientsData } = await supabase
         .from('clients')
         .select('id, nome, status, briefing, created_at')
         .order('created_at', { ascending: false });

      const { data: projectsData } = await supabase
         .from('projects')
         .select('*, clients (nome)')
         .order('created_at', { ascending: false });

      if (projectsData) {
         setProjects(projectsData.slice(0, 3).map(p => ({
            id: p.id,
            name: p.name,
            client: p.clients?.nome || 'Geral',
            budget: Number(p.total_budget),
            spent: Number(p.spent_amount),
            progress: p.total_budget > 0 ? Math.round((Number(p.spent_amount) / Number(p.total_budget)) * 100) : 0,
            status: Number(p.spent_amount) > Number(p.total_budget) ? 'warning' : 'active',
            responsibleName: p.responsible_name || '',
            responsiblePhone: p.responsible_phone || ''
         })));
         setTotalReceita(projectsData.reduce((a, p) => a + Number(p.total_budget), 0));
         setTotalGastos(projectsData.reduce((a, p) => a + Number(p.spent_amount), 0));
      }

      await fetchOperationalAlerts(projectsData || []);

      const { data: proposalsData } = await supabase
         .from('proposals')
         .select('id, proposal_number, client_name, project_name, total, status, created_at')
         .order('created_at', { ascending: false });

      const safeClients = clientsData || [];
      const safeProposals = proposalsData || [];
      const totalLeads = safeClients.length;
      const contratados = safeClients.filter(c => c.status === 'contratado').length;
      const perdidos = safeClients.filter(c => c.status === 'perdido').length;
      const oportunidadesFinalizadas = contratados + perdidos;

      setClients(safeClients);
      setProposalCount(safeProposals.filter(p => p.status === 'sent' || p.status === 'draft').length);
      setRecentProposals(safeProposals.slice(0, 3));
      setCommercialStats({
         totalLeads,
         leadsNovo: safeClients.filter(c => c.status === 'novo').length,
         emBriefing: safeClients.filter(c => c.status === 'em_briefing').length,
         propostasEnviadas: safeClients.filter(c => c.status === 'proposta_enviada').length,
         contratados,
         perdidos,
         valorPropostasAbertas: safeProposals
            .filter(p => p.status === 'sent' || p.status === 'draft')
            .reduce((sum, proposal) => sum + Number(proposal.total || 0), 0),
         valorAprovado: safeProposals
            .filter(p => p.status === 'approved')
            .reduce((sum, proposal) => sum + Number(proposal.total || 0), 0),
         conversao: oportunidadesFinalizadas > 0 ? Math.round((contratados / oportunidadesFinalizadas) * 100) : 0,
      });
      setLoading(false);
   };

   const fetchOperationalAlerts = async (projectsData: any[]) => {
      const projectMap = new Map(projectsData.map(project => [project.id, {
         name: project.name,
         responsibleName: project.responsible_name || '',
         responsiblePhone: project.responsible_phone || ''
      }]));
      const today = new Date().toISOString().split('T')[0];
      const nextLimit = new Date();
      nextLimit.setDate(nextLimit.getDate() + 7);
      const nextLimitDate = nextLimit.toISOString().split('T')[0];

      const [{ data: tasksData }, { data: documentsData }, { data: scheduleData }] = await Promise.all([
         supabase
            .from('project_execution_tasks')
            .select('id, project_id, title, due_date, status, responsible')
            .neq('status', 'done')
            .not('due_date', 'is', null)
            .lte('due_date', nextLimitDate),
         supabase
            .from('documents')
            .select('id, project_id, nome, data_validade, status_validade')
            .not('project_id', 'is', null)
            .or(`status_validade.eq.vencido,status_validade.eq.proximo_vencimento,data_validade.lte.${nextLimitDate}`),
         supabase
            .from('schedule_events')
            .select('id, project_id, title, start_date, status')
            .neq('status', 'completed')
            .lte('start_date', nextLimitDate)
            .order('start_date', { ascending: true })
      ]);

      const alerts = [
         ...(tasksData || []).map(task => {
            const project = projectMap.get(task.project_id);
            const overdue = task.due_date < today;
            return {
               id: `task-${task.id}`,
               type: overdue ? 'Tarefa atrasada' : 'Tarefa próxima',
               severity: overdue ? 'high' : 'medium',
               title: task.title,
               subtitle: project?.name || 'Obra',
               date: task.due_date,
               responsibleName: project?.responsibleName || task.responsible || '',
               responsiblePhone: project?.responsiblePhone || '',
               message: `Olá ${project?.responsibleName || task.responsible || 'responsável'}, atenção para a obra *${project?.name || 'obra'}*: a tarefa *${task.title}* ${overdue ? 'está atrasada' : 'vence em breve'} (${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}).`
            };
         }),
         ...(documentsData || []).map(document => {
            const project = projectMap.get(document.project_id);
            const overdue = document.data_validade && document.data_validade < today;
            return {
               id: `doc-${document.id}`,
               type: overdue ? 'Documento vencido' : 'Documento a vencer',
               severity: overdue ? 'high' : 'medium',
               title: document.nome,
               subtitle: project?.name || 'Obra',
               date: document.data_validade,
               responsibleName: project?.responsibleName || '',
               responsiblePhone: project?.responsiblePhone || '',
               message: `Olá ${project?.responsibleName || 'responsável'}, atenção para a obra *${project?.name || 'obra'}*: o documento *${document.nome}* ${overdue ? 'está vencido' : 'vence em breve'}${document.data_validade ? ` (${new Date(`${document.data_validade}T00:00:00`).toLocaleDateString()})` : ''}.`
            };
         }),
         ...(scheduleData || []).map(event => {
            const project = projectMap.get(event.project_id);
            return {
               id: `schedule-${event.id}`,
               type: 'Marco próximo',
               severity: 'low',
               title: event.title,
               subtitle: project?.name || 'Obra',
               date: event.start_date,
               responsibleName: project?.responsibleName || '',
               responsiblePhone: project?.responsiblePhone || '',
               message: `Olá ${project?.responsibleName || 'responsável'}, lembrete da obra *${project?.name || 'obra'}*: o marco *${event.title}* está previsto para ${new Date(`${event.start_date}T00:00:00`).toLocaleDateString()}.`
            };
         })
      ];

      setOperationalAlerts(alerts
         .sort((a, b) => (a.date || '9999-12-31').localeCompare(b.date || '9999-12-31'))
         .slice(0, 6));
   };

   const sendAlertWhatsapp = (alert: any) => {
      if (!alert.responsiblePhone) return;
      window.open(createWhatsappLink(alert.responsiblePhone, alert.message), '_blank');
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
                  <p className="text-white font-black text-lg leading-none">{commercialStats.totalLeads}</p>
                  <p className="text-teal-100 text-[10px] font-bold mt-1 uppercase tracking-wide">Leads</p>
               </div>
               <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/20">
                  <p className="text-white font-black text-base leading-none">
                     {commercialStats.conversao}%
                  </p>
                  <p className="text-teal-100 text-[10px] font-bold mt-1 uppercase tracking-wide">Conversão</p>
               </div>
            </div>
         </div>

         {/* ── Dashboard Comercial ── */}
         <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-5">
               <div>
                  <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                     <Users size={16} className="text-teal-600" /> Dashboard Comercial
                  </h2>
                  <p className="text-xs font-bold text-gray-400 mt-1">Funil de leads, propostas e oportunidades em andamento.</p>
               </div>
               <button
                  onClick={() => navigate('/registrations')}
                  className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all"
               >
                  Ver leads
               </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
               <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">Lead novo</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{commercialStats.leadsNovo}</p>
               </div>
               <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">Em briefing</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{commercialStats.emBriefing}</p>
               </div>
               <div className="p-4 rounded-2xl bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">Proposta enviada</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{commercialStats.propostasEnviadas}</p>
               </div>
               <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">Contratados</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{commercialStats.contratados}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor em aberto</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">R$ {commercialStats.valorPropostasAbertas.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] font-bold text-violet-500 mt-1">{proposalCount} proposta(s) em negociação</p>
               </div>
               <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor aprovado</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">R$ {commercialStats.valorAprovado.toLocaleString('pt-BR')}</p>
                  <p className="text-[10px] font-bold text-emerald-500 mt-1">Receita comercial contratada</p>
               </div>
               <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conversão</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{commercialStats.conversao}%</p>
                  <p className="text-[10px] font-bold text-teal-500 mt-1">{commercialStats.perdidos} oportunidade(s) perdida(s)</p>
               </div>
            </div>
         </div>

         {(clients.some(c => !c.briefing?.objetivo) || commercialStats.propostasEnviadas > 0) && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                     <AlertTriangle size={16} className="text-amber-500" /> Próximas Ações
                  </h2>
               </div>
               <div className="space-y-3">
                  {clients.filter(c => !c.briefing?.objetivo).slice(0, 2).map((client) => (
                     <button
                        key={client.id}
                        onClick={() => navigate('/registrations')}
                        className="w-full flex items-center justify-between gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-left"
                     >
                        <div>
                           <p className="text-sm font-black text-gray-900 dark:text-white">{client.nome}</p>
                           <p className="text-[10px] font-bold text-amber-600 dark:text-amber-300 uppercase tracking-widest">Briefing pendente</p>
                        </div>
                        <ChevronRight size={18} className="text-amber-500" />
                     </button>
                  ))}
                  {commercialStats.propostasEnviadas > 0 && (
                     <button
                        onClick={() => navigate('/proposals')}
                        className="w-full flex items-center justify-between gap-4 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-900/30 rounded-2xl text-left"
                     >
                        <div>
                           <p className="text-sm font-black text-gray-900 dark:text-white">{commercialStats.propostasEnviadas} proposta(s) aguardando retorno</p>
                           <p className="text-[10px] font-bold text-violet-600 dark:text-violet-300 uppercase tracking-widest">Fazer follow-up comercial</p>
                        </div>
                        <ChevronRight size={18} className="text-violet-500" />
                     </button>
                  )}
               </div>
            </div>
         )}

         {operationalAlerts.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <div>
                     <h2 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-500" /> Alertas de Obra
                     </h2>
                     <p className="text-xs font-bold text-gray-400 mt-1">Tarefas, documentos e marcos que precisam de atenção.</p>
                  </div>
                  <button
                     onClick={() => navigate('/projects')}
                     className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-600 hover:text-white transition-all"
                  >
                     Ver obras
                  </button>
               </div>

               <div className="space-y-3">
                  {operationalAlerts.map(alert => (
                     <div
                        key={alert.id}
                        className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${
                           alert.severity === 'high'
                              ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30'
                              : alert.severity === 'medium'
                                 ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
                                 : 'bg-teal-50 border-teal-100 dark:bg-teal-900/10 dark:border-teal-900/30'
                        }`}
                     >
                        <button onClick={() => navigate('/projects')} className="min-w-0 flex-1 text-left">
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{alert.type}</p>
                           <p className="mt-1 truncate text-sm font-black text-gray-900 dark:text-white">{alert.title}</p>
                           <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">{alert.subtitle}{alert.date ? ` · ${new Date(`${alert.date}T00:00:00`).toLocaleDateString()}` : ''}</p>
                        </button>
                        <button
                           onClick={() => sendAlertWhatsapp(alert)}
                           disabled={!alert.responsiblePhone}
                           className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800"
                           title={alert.responsiblePhone ? `Avisar ${alert.responsibleName || 'responsável'}` : 'Cadastre o WhatsApp do responsável na obra'}
                        >
                           <MessageCircle size={15} />
                           Avisar WhatsApp
                        </button>
                     </div>
                  ))}
               </div>
            </div>
         )}

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
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">R$ {Number(p.total || 0).toLocaleString('pt-BR')}</p>
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
