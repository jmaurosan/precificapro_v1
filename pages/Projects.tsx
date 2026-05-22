// Versão 4.0.1 - Depuração de Referência
import {
   AlertTriangle,
   ArrowLeft,
   Building,
   Camera,
   CalendarDays,
   Check,
   CheckCircle2,
   ChevronRight,
   ClipboardCheck,
   CloudDownload,
   DollarSign,
   FileText,
   Hammer,
   Info,
   Loader2,
   MessageCircle,
   PlayCircle,
   Plus,
   Receipt,
   Trash2,
   X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { calcularResumoCustos } from '../services/custosProjetoService';
import { consultarNFPrefeituraCG } from '../services/notaFiscalCGService';
import { InspectionTemplate, NonConformity, Project } from '../types';
import { CategoriaCusto, CustoProjeto, StatusCusto } from '../types/custosProjeto';
import { ParametrosConsultaNFCampoGrande } from '../types/notaFiscalCG';
import { formatInputCurrency, parseCurrency } from '../utils/formatters';
import { createWhatsappLink } from '../utils/whatsapp';

const INSPECTION_TEMPLATES: InspectionTemplate[] = [
   {
      id: 'tpl_demolicao',
      name: 'Demolição e Preparação',
      description: 'Verificação de segurança e remoção de entulhos.',
      items: ['Desconexão de redes (elétrica/hidráulica)', 'Uso de EPIs', 'Remoção correta de entulhos', 'Proteção de áreas adjacentes']
   },
   {
      id: 'tpl_alvenaria',
      name: 'Alvenaria e Estrutura',
      description: 'Conferência de prumo, nível e esquadro.',
      items: ['Locação das paredes', 'Prumo e nível', 'Amarração da alvenaria', 'Vergas e contravergas', 'Chapisco executado']
   },
   {
      id: 'tpl_instalacoes',
      name: 'Instalações (Elétrica/Hidráulica)',
      description: 'Checagem antes do fechamento de paredes.',
      items: ['Passagem de conduítes', 'Teste de pressão hidráulica', 'Caixas de passagem niveladas', 'Tubulação de esgoto com caimento']
   },
   {
      id: 'tpl_acabamento',
      name: 'Acabamentos e Revestimentos',
      description: 'Inspeção visual de pisos e paredes.',
      items: ['Assentamento de pisos (nível/juntas)', 'Recortes bem executados', 'Caimento para ralos', 'Rejuntamento uniforme']
   },
   {
      id: 'tpl_pintura',
      name: 'Pintura e Entrega',
      description: 'Vistoria final de aparência.',
      items: ['Lixamento uniforme', 'Cobertura da tinta (sem manchas)', 'Recortes de teto/rodapé', 'Limpeza geral']
   }
];

interface ScheduleEvent {
   id: string;
   projectId: string;
   title: string;
   description?: string;
   startDate: string;
   endDate: string;
   status: 'on-track' | 'delayed' | 'completed';
   color?: string;
}

interface DailyReport {
   id: string;
   projectId: string;
   reportDate: string;
   weather: 'nao_informado' | 'sol' | 'nublado' | 'chuva' | 'interrompido';
   status: 'em_andamento' | 'concluido' | 'parcial' | 'bloqueado';
   workforce?: string;
   activities: string;
   blockers?: string;
   nextSteps?: string;
   photos: string[];
   sharedWithClient: boolean;
   createdAt: string;
}

const EXECUTION_PLAN_TEMPLATE = [
   {
      title: 'Kickoff e alinhamento de obra',
      description: 'Reunião inicial com cliente, equipe e responsáveis para validar escopo, regras e comunicação.',
      startOffset: 0,
      durationDays: 1
   },
   {
      title: 'Mobilização e proteção do imóvel',
      description: 'Organização de acesso, proteção de áreas, recebimento inicial e preparação do canteiro.',
      startOffset: 1,
      durationDays: 2
   },
   {
      title: 'Demolições e preparação',
      description: 'Execução das remoções, descarte de resíduos e preparação para instalações.',
      startOffset: 3,
      durationDays: 5
   },
   {
      title: 'Instalações elétrica e hidráulica',
      description: 'Passagem, ajustes, testes preliminares e conferência antes dos fechamentos.',
      startOffset: 8,
      durationDays: 7
   },
   {
      title: 'Revestimentos e acabamentos',
      description: 'Assentamentos, pintura, marcenaria, metais, louças e acabamentos finais.',
      startOffset: 15,
      durationDays: 12
   },
   {
      title: 'Vistoria final e entrega técnica',
      description: 'Checklist final, correções, limpeza, registros e termo de entrega da obra.',
      startOffset: 28,
      durationDays: 2
   }
] as const;

const addDays = (date: string, days: number) => {
   const nextDate = new Date(`${date}T00:00:00`);
   nextDate.setDate(nextDate.getDate() + days);
   return nextDate.toISOString().split('T')[0];
};

// Componente Interno para o Form de Lote
const BatchForm: React.FC<{ onSave: (items: any[], header: any) => void, onCancel: () => void }> = ({ onSave, onCancel }) => {
   const [header, setHeader] = useState({ fornecedor: '', data: new Date().toISOString().split('T')[0], status: 'pago' as StatusCusto });
   const [items, setItems] = useState([{ id: '1', descricao: '', quantidade: 1, unitValue: 0, categoria: 'material' as CategoriaCusto }]);

   const total = items.reduce((acc, curr) => acc + (Number(curr.quantidade) * Number(curr.unitValue)), 0);

   return (
      <div className="flex flex-col flex-1 overflow-hidden">
         <div className="px-8 py-6 bg-white dark:bg-gray-950 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 border-b border-gray-50 dark:border-gray-800">
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</label><input type="text" value={header.fornecedor} onChange={e => setHeader({ ...header, fornecedor: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" placeholder="Ex: Leroy Merlin" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label><input type="date" value={header.data} onChange={e => setHeader({ ...header, data: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label><select value={header.status} onChange={e => setHeader({ ...header, status: e.target.value as StatusCusto })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold"><option value="pago">Já Pago</option><option value="confirmado">Confirmado</option><option value="planejado">Planejado</option></select></div>
         </div>
         <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
            {items.map((it, idx) => (
               <div key={it.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end p-6 bg-gray-50/50 dark:bg-gray-900/50 rounded-[32px] border border-gray-100 dark:border-gray-800 animate-in slide-in-from-right-4 duration-200">
                  <div className="lg:col-span-1 flex items-center justify-center"><span className="w-8 h-8 rounded-full bg-teal-50 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-teal-600">{idx + 1}</span></div>
                  <div className="lg:col-span-5"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Descrição</label><input type="text" value={it.descricao} onChange={e => setItems(items.map(i => i.id === it.id ? { ...i, descricao: e.target.value } : i))} className="w-full bg-transparent font-black text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 outline-none pb-1" /></div>
                  <div className="lg:col-span-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Quant.</label><input type="number" step="1" value={it.quantidade} onChange={e => setItems(items.map(i => i.id === it.id ? { ...i, quantidade: parseInt(e.target.value) || 1 } : i))} className="w-full bg-white dark:bg-gray-800 px-3 py-2 rounded-xl font-black text-center" /></div>
                  <div className="lg:col-span-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor Unit.</label><input type="number" step="0.01" value={it.unitValue} onChange={e => setItems(items.map(i => i.id === it.id ? { ...i, unitValue: parseFloat(e.target.value) || 0 } : i))} className="w-full bg-white dark:bg-gray-800 px-3 py-2 rounded-xl font-black text-center text-rose-500" /></div>
                  <div className="lg:col-span-2 flex justify-center"><button onClick={() => setItems(items.filter(i => i.id !== it.id))} className="p-3 text-gray-300 hover:text-rose-500"><Trash2 size={18} /></button></div>
               </div>
            ))}
            <button onClick={() => setItems([...items, { id: Date.now().toString(), descricao: '', quantidade: 1, unitValue: 0, categoria: 'material' }])} className="w-full py-5 border-2 border-dashed border-gray-200 rounded-[32px] text-[10px] font-black text-gray-400 uppercase hover:text-teal-600 hover:border-teal-600 transition-all">+ Adicionar Item à Nota</button>
         </div>
         <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-8 bg-white dark:bg-gray-950 rounded-b-[48px]">
            <div className="flex items-center gap-6"><div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[28px] flex items-center justify-center"><DollarSign size={32} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total do Lote</p><h3 className="text-3xl font-black text-emerald-600">R$ {total.toLocaleString('pt-BR')}</h3></div></div>
            <div className="flex gap-4 w-full md:w-auto"><button onClick={onCancel} className="flex-1 md:px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase">Cancelar</button><button onClick={() => onSave(items, header)} className="flex-1 md:px-12 py-4 bg-teal-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3"><Check size={20} /> Inserir {items.length} Itens no Projeto</button></div>
         </div>
      </div>
   );
};

const Projects: React.FC = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { user } = useAuth();

   const [projects, setProjects] = useState<Project[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   const [clients, setClients] = useState<{ id: string, nome: string }[]>([]);
   const [custos, setCustos] = useState<CustoProjeto[]>([]);
   const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
   const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

   const [selectedProject, setSelectedProject] = useState<Project | null>(null);
   const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'diary' | 'finance' | 'quality'>('overview');
   const [showBatchModal, setShowBatchModal] = useState(false);
   const [showFiscalModal, setShowFiscalModal] = useState(false);
   const [isCreatingPlan, setIsCreatingPlan] = useState(false);
   const [isSavingDailyReport, setIsSavingDailyReport] = useState(false);
   const [clientReportDays, setClientReportDays] = useState<'7' | '15' | '30' | 'all'>('7');
   const [dailyReportForm, setDailyReportForm] = useState({
      reportDate: new Date().toISOString().split('T')[0],
      weather: 'nao_informado' as DailyReport['weather'],
      status: 'em_andamento' as DailyReport['status'],
      workforce: '',
      activities: '',
      blockers: '',
      nextSteps: '',
      photosText: ''
   });

   // Estados para Módulo de Qualidade
   const [showInspectionModal, setShowInspectionModal] = useState(false);
   const [showNonConformityModal, setShowNonConformityModal] = useState(false);
   const [selectedTemplate, setSelectedTemplate] = useState<InspectionTemplate | null>(null);
   const [currentInspectionItems, setCurrentInspectionItems] = useState<string[]>([]);
   const [inspectionPhoto, setInspectionPhoto] = useState<string | null>(null);
   const [nonConformityForm, setNonConformityForm] = useState<Partial<NonConformity>>({ status: 'open', reworkCost: 0 });

   // Estados para Criação de Projeto
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [newProjectForm, setNewProjectForm] = useState({
      name: '',
      totalBudget: 0,
      startDate: new Date().toISOString().split('T')[0],
      clientName: '',
      clientId: ''
   });

   const [isFetchingFiscal, setIsFetchingFiscal] = useState(false);

   // Estados para Busca Fiscal
   const [fiscalParams, setFiscalParams] = useState<ParametrosConsultaNFCampoGrande>({
      tipo: 'sistema_antigo',
      cnpjPrestador: '',
      codigoVerificacao: '',
      numeroNota: '',
      inscricaoMunicipal: ''
   });

   const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

   const resumo = useMemo(() => {
      if (!selectedProject) return null;
      const custosObra = custos.filter(c => c.projetoId === selectedProject.id);
      return calcularResumoCustos(custosObra, selectedProject.totalBudget);
   }, [selectedProject, custos]);

   const selectedProjectSchedule = useMemo(() => {
      if (!selectedProject) return [];
      return scheduleEvents
         .filter(event => event.projectId === selectedProject.id)
         .sort((a, b) => a.startDate.localeCompare(b.startDate));
   }, [selectedProject, scheduleEvents]);

   const scheduleCompleted = selectedProjectSchedule.filter(event => event.status === 'completed').length;
   const scheduleProgress = selectedProjectSchedule.length
      ? Math.round((scheduleCompleted / selectedProjectSchedule.length) * 100)
      : 0;
   const nextScheduleEvent = selectedProjectSchedule.find(event => event.status !== 'completed');
   const selectedProjectReports = useMemo(() => {
      if (!selectedProject) return [];
      return dailyReports
         .filter(report => report.projectId === selectedProject.id)
         .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
   }, [selectedProject, dailyReports]);
   const latestDailyReport = selectedProjectReports[0];
   const clientReportWindowReports = useMemo(() => {
      if (clientReportDays === 'all') return selectedProjectReports;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(clientReportDays));
      const cutoffDate = cutoff.toISOString().split('T')[0];

      return selectedProjectReports.filter(report => report.reportDate >= cutoffDate);
   }, [selectedProjectReports, clientReportDays]);
   const clientReportPeriodLabel = clientReportDays === 'all'
      ? 'todo o histórico'
      : `últimos ${clientReportDays} dias`;

   // Fetch data from Supabase
   useEffect(() => {
      if (user) {
         fetchProjects();
      }
   }, [user]);

   useEffect(() => {
      if (selectedProject) {
         fetchCosts(selectedProject.id);
         fetchScheduleEvents(selectedProject.id);
         fetchDailyReports(selectedProject.id);
      }
   }, [selectedProject]);

   const fetchProjects = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
         .from('projects')
         .select(`
            *,
            clients (nome)
         `)
         .order('created_at', { ascending: false });

      if (error) {
         console.error('Error fetching projects:', error);
      } else {
         setProjects(data.map(p => ({
            ...p,
            clientName: p.clients?.nome || 'Cliente não encontrado',
            clientId: p.client_id,
            totalBudget: Number(p.total_budget),
            spentAmount: Number(p.spent_amount),
            startDate: p.start_date,
            nonConformities: p.non_conformities
         })) as Project[]);
      }
      setIsLoading(false);
   };

   const fetchCosts = async (projectId: string) => {
      const { data, error } = await supabase
         .from('custos_projeto')
         .select('*')
         .eq('project_id', projectId)
         .order('data_lancamento', { ascending: false });

      if (error) {
         console.error('Error fetching costs:', error);
      } else {
         setCustos(data.map(c => ({
            ...c,
            projetoId: c.project_id,
            custoUnitario: Number(c.custo_unitario),
            custoTotal: Number(c.custo_total),
            dataLancamento: c.data_lancamento,
            prestadorNome: c.prestador_nome
         })) as CustoProjeto[]);
      }
   };

   const fetchScheduleEvents = async (projectId: string) => {
      const { data, error } = await supabase
         .from('schedule_events')
         .select('*')
         .eq('project_id', projectId)
         .order('start_date', { ascending: true });

      if (error) {
         console.error('Error fetching schedule events:', error);
         return;
      }

      setScheduleEvents(prev => [
         ...prev.filter(event => event.projectId !== projectId),
         ...(data || []).map((event: any) => ({
            id: event.id,
            projectId: event.project_id,
            title: event.title,
            description: event.description,
            startDate: event.start_date,
            endDate: event.end_date,
            status: event.status,
            color: event.color
         }))
      ]);
   };

   const handleCreateExecutionPlan = async () => {
      if (!selectedProject || !user?.id) return;

      setIsCreatingPlan(true);
      const baseDate = selectedProject.startDate || new Date().toISOString().split('T')[0];
      const existingTitles = new Set(selectedProjectSchedule.map(event => event.title.toLowerCase()));
      const payload = EXECUTION_PLAN_TEMPLATE
         .filter(step => !existingTitles.has(step.title.toLowerCase()))
         .map(step => ({
            user_id: user.id,
            project_id: selectedProject.id,
            title: step.title,
            description: step.description,
            start_date: addDays(baseDate, step.startOffset),
            end_date: addDays(baseDate, step.startOffset + step.durationDays),
            status: 'on-track',
            color: 'teal'
         }));

      if (!payload.length) {
         setMessage({ text: 'O roteiro padrão desta obra já foi criado.', type: 'success' });
         setTimeout(() => setMessage(null), 3000);
         setIsCreatingPlan(false);
         return;
      }

      const { error } = await supabase.from('schedule_events').insert(payload);

      if (error) {
         setMessage({ text: 'Erro ao gerar plano de execução: ' + error.message, type: 'error' });
         setTimeout(() => setMessage(null), 4500);
      } else {
         await fetchScheduleEvents(selectedProject.id);
         setMessage({ text: 'Plano de execução criado no cronograma da obra.', type: 'success' });
         setTimeout(() => setMessage(null), 3500);
      }

      setIsCreatingPlan(false);
   };

   const handleUpdateScheduleStatus = async (event: ScheduleEvent, status: ScheduleEvent['status']) => {
      if (!selectedProject) return;

      const { error } = await supabase
         .from('schedule_events')
         .update({ status })
         .eq('id', event.id);

      if (error) {
         setMessage({ text: 'Erro ao atualizar etapa: ' + error.message, type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      await fetchScheduleEvents(selectedProject.id);
   };

   const fetchDailyReports = async (projectId: string) => {
      const { data, error } = await supabase
         .from('project_daily_reports')
         .select('*')
         .eq('project_id', projectId)
         .order('report_date', { ascending: false });

      if (error) {
         console.warn('Diário de obra indisponível:', error.message);
         return;
      }

      setDailyReports(prev => [
         ...prev.filter(report => report.projectId !== projectId),
         ...(data || []).map((report: any) => ({
            id: report.id,
            projectId: report.project_id,
            reportDate: report.report_date,
            weather: report.weather,
            status: report.status,
            workforce: report.workforce || '',
            activities: report.activities,
            blockers: report.blockers || '',
            nextSteps: report.next_steps || '',
            photos: Array.isArray(report.photos) ? report.photos : [],
            sharedWithClient: Boolean(report.shared_with_client),
            createdAt: report.created_at
         }))
      ]);
   };

   const resetDailyReportForm = () => {
      setDailyReportForm({
         reportDate: new Date().toISOString().split('T')[0],
         weather: 'nao_informado',
         status: 'em_andamento',
         workforce: '',
         activities: '',
         blockers: '',
         nextSteps: '',
         photosText: ''
      });
   };

   const handleSaveDailyReport = async () => {
      if (!selectedProject || !user?.id || !dailyReportForm.activities.trim()) return;

      setIsSavingDailyReport(true);
      const photos = dailyReportForm.photosText
         .split('\n')
         .map(item => item.trim())
         .filter(Boolean);

      const { error } = await supabase.from('project_daily_reports').insert([{
         user_id: user.id,
         project_id: selectedProject.id,
         report_date: dailyReportForm.reportDate,
         weather: dailyReportForm.weather,
         status: dailyReportForm.status,
         workforce: dailyReportForm.workforce || null,
         activities: dailyReportForm.activities,
         blockers: dailyReportForm.blockers || null,
         next_steps: dailyReportForm.nextSteps || null,
         photos,
         shared_with_client: false
      }]);

      if (error) {
         setMessage({ text: 'Erro ao salvar diário. Aplique a migration 00007_project_daily_reports.sql no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
      } else {
         await fetchDailyReports(selectedProject.id);
         resetDailyReportForm();
         setMessage({ text: 'Diário de obra registrado com sucesso.', type: 'success' });
         setTimeout(() => setMessage(null), 3500);
      }

      setIsSavingDailyReport(false);
   };

   const handleCopyDailyReportSummary = (report: DailyReport) => {
      if (!selectedProject) return;

      const text = [
         `Diário de Obra - ${selectedProject.name}`,
         `Cliente: ${selectedProject.clientName}`,
         `Data: ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}`,
         `Status: ${report.status.replace('_', ' ')}`,
         report.workforce ? `Equipe/Responsáveis: ${report.workforce}` : '',
         '',
         `Atividades realizadas:`,
         report.activities,
         report.blockers ? `\nPendências / Bloqueios:\n${report.blockers}` : '',
         report.nextSteps ? `\nPróximos passos:\n${report.nextSteps}` : ''
      ].filter(Boolean).join('\n');

      navigator.clipboard.writeText(text);
      setMessage({ text: 'Resumo do diário copiado.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
   };

   const buildClientProgressReport = () => {
      if (!selectedProject) return '';

      const reports = clientReportWindowReports;
      const latestReportDate = reports[0]?.reportDate
         ? new Date(`${reports[0].reportDate}T00:00:00`).toLocaleDateString()
         : 'sem registros no período';
      const activities = reports
         .map(report => `- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${report.activities}`)
         .join('\n');
      const blockers = reports
         .filter(report => report.blockers)
         .map(report => `- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${report.blockers}`)
         .join('\n');
      const nextSteps = reports
         .filter(report => report.nextSteps)
         .map(report => `- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${report.nextSteps}`)
         .join('\n');
      const photosCount = reports.reduce((total, report) => total + report.photos.length, 0);

      return [
         `Relatório de Andamento - ${selectedProject.name}`,
         `Cliente: ${selectedProject.clientName}`,
         `Período: ${clientReportPeriodLabel}`,
         `Última atualização: ${latestReportDate}`,
         `Avanço físico registrado: ${scheduleProgress}%`,
         nextScheduleEvent ? `Próximo marco: ${nextScheduleEvent.title}` : '',
         '',
         'Resumo das atividades:',
         activities || 'Ainda não há atividades registradas neste período.',
         '',
         'Pendências e pontos de atenção:',
         blockers || 'Nenhuma pendência relevante registrada no período.',
         '',
         'Próximos passos:',
         nextSteps || 'Os próximos passos serão atualizados no próximo acompanhamento.',
         '',
         photosCount ? `Registros fotográficos anexados/linkados: ${photosCount}` : ''
      ].filter(line => line !== '').join('\n');
   };

   const handleCopyClientProgressReport = () => {
      const reportText = buildClientProgressReport();
      if (!reportText) return;

      navigator.clipboard.writeText(reportText);
      setMessage({ text: 'Relatório de andamento copiado para enviar ao cliente.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
   };

   const handleSendClientProgressWhatsapp = () => {
      const reportText = buildClientProgressReport();
      if (!reportText || !selectedProject) return;

      window.open(createWhatsappLink('11999999999', reportText), '_blank');
   };

   // Verifica se veio redirecionado do Cliente com intenção de criar obra
   useEffect(() => {
      if (location.state && location.state.createForClient) {
         const client = location.state.createForClient;
         setNewProjectForm(prev => ({
            ...prev,
            clientName: client.nome,
            clientId: client.id
         }));
         setShowCreateModal(true);

         // Limpa o state de forma segura para evitar loops ou reaberturas, mas usando o router
         navigate(location.pathname, { replace: true, state: {} });
      }
   }, [location.state]); // Dependência apenas do state para evitar loops desnecessários

   useEffect(() => {
      if (showCreateModal) {
         fetchClients();
      }
   }, [showCreateModal]);

   const fetchClients = async () => {
      const { data } = await supabase.from('clients').select('id, nome').order('nome');
      if (data) setClients(data);
   };

   const handleFetchFiscal = async () => {
      if (!selectedProject) return;
      setIsFetchingFiscal(true);
      const result = await consultarNFPrefeituraCG(fiscalParams);

      if (result.validada && result.numero) {
         const novoCusto: CustoProjeto = {
            id: `nf-cg-${Date.now()}`,
            projetoId: selectedProject.id,
            descricao: `${result.descricaoServicos} (NF: ${result.numero})`,
            categoria: 'servico',
            quantidade: 1,
            unidade: 'serv',
            custoUnitario: result.valorTotal || 0,
            custoTotal: result.valorTotal || 0,
            dataLancamento: result.dataEmissao?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            status: 'pago',
            prestadorNome: result.prestadorNome
         };
         setCustos([novoCusto, ...custos]);
         setShowFiscalModal(false);
         setMessage({ text: "Nota Fiscal de Campo Grande importada com sucesso!", type: 'success' });
         setTimeout(() => setMessage(null), 3000);
      } else {
         setMessage({ text: result.mensagem, type: 'error' });
         setTimeout(() => setMessage(null), 3000);
      }
      setIsFetchingFiscal(false);
   };

   const handleCreateProject = async () => {
      if (!newProjectForm.name || !newProjectForm.clientName) return;

      const payload = {
         name: newProjectForm.name,
         client_id: newProjectForm.clientId,
         total_budget: newProjectForm.totalBudget,
         start_date: newProjectForm.startDate,
         status: 'active',
         user_id: user?.id
      };

      console.log('Criando projeto com payload:', payload);
      const { data, error } = await supabase.from('projects').insert([payload]).select();

      if (error) {
         console.error('Erro Supabase:', error);
         setMessage({ text: 'Erro ao criar projeto: ' + error.message, type: 'error' });
      } else {
         await fetchProjects();
         setMessage({ text: 'Nova obra criada e salva com sucesso!', type: 'success' });
         setTimeout(() => {
            setShowCreateModal(false);
            setMessage(null);
         }, 1500);
         setNewProjectForm({
            name: '',
            totalBudget: 0,
            startDate: new Date().toISOString().split('T')[0],
            clientName: '',
            clientId: ''
         });
      }
   };

   const handleSaveBatch = async (batchItems: any[], batchHeader: any) => {
      if (!selectedProject) return;
      const novosCustosPayload = batchItems.map(item => ({
         project_id: selectedProject.id,
         descricao: item.descricao,
         prestador_nome: batchHeader.fornecedor,
         categoria: item.categoria || 'material',
         quantidade: Number(item.quantidade) || 1,
         unidade: 'un',
         custo_unitario: Number(item.unitValue) || 0,
         custo_total: Number(item.quantidade) * Number(item.unitValue),
         data_lancamento: batchHeader.data,
         status: batchHeader.status
      }));

      const { error } = await supabase.from('custos_projeto').insert(novosCustosPayload);

      if (error) {
         setMessage({ text: 'Erro ao salvar custos: ' + error.message, type: 'error' });
      } else {
         await fetchCosts(selectedProject.id);
         setMessage({ text: 'Itens da Nota Fiscal salvos com sucesso!', type: 'success' });
         setTimeout(() => {
            setShowBatchModal(false);
            setMessage(null);
         }, 1500);
      }
   };

   // Placeholder functions for Quality
   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'inspection' | 'nc') => {
      const file = e.target.files?.[0];
      if (file) {
         const reader = new FileReader();
         reader.onload = (ev) => {
            if (type === 'inspection') setInspectionPhoto(ev.target?.result as string);
            else setNonConformityForm(prev => ({ ...prev, photo: ev.target?.result as string }));
         };
         reader.readAsDataURL(file);
      }
   };

   const handleCreateInspection = async (status: 'approved' | 'rejected') => {
      if (!selectedProject || !selectedTemplate) return;

      const newInspection: any = {
         id: `insp-${Date.now()}`,
         projectId: selectedProject.id,
         templateId: selectedTemplate.id,
         templateName: selectedTemplate.name,
         date: new Date().toISOString(),
         responsible: user?.name || 'Sistema',
         status: status === 'rejected' ? 'rejected' : 'approved',
         itemsChecked: currentInspectionItems,
         photos: inspectionPhoto ? [inspectionPhoto] : []
      };

      const updatedInspections = [newInspection, ...(selectedProject.inspections || [])];

      const { error } = await supabase
         .from('projects')
         .update({ inspections: updatedInspections })
         .eq('id', selectedProject.id);

      if (error) {
         setMessage({ text: 'Erro ao salvar vistoria: ' + error.message, type: 'error' });
      } else {
         const updatedProject = { ...selectedProject, inspections: updatedInspections };
         setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
         setSelectedProject(updatedProject);
         setMessage({ text: 'Vistoria registrada com sucesso!', type: 'success' });

         setTimeout(() => {
            setMessage(null);
            if (status === 'rejected') {
               setShowInspectionModal(false);
               setShowNonConformityModal(true);
            } else {
               setShowInspectionModal(false);
               setSelectedTemplate(null);
               setCurrentInspectionItems([]);
               setInspectionPhoto(null);
            }
         }, 1500);
      }
   };

   const handleCreateNonConformity = async () => {
      if (!selectedProject || !nonConformityForm.description) return;

      const newNC: NonConformity = {
         id: `nc-${Date.now()}`,
         projectId: selectedProject.id,
         description: nonConformityForm.description,
         createdAt: new Date().toISOString(),
         status: 'open',
         reworkCost: nonConformityForm.reworkCost || 0,
         responsible: nonConformityForm.responsible || 'Não informado',
         photo: nonConformityForm.photo,
         deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const updatedNCs = [newNC, ...(selectedProject.nonConformities || [])];

      const { error } = await supabase
         .from('projects')
         .update({ non_conformities: updatedNCs })
         .eq('id', selectedProject.id);

      if (error) {
         setMessage({ text: 'Erro ao salvar report: ' + error.message, type: 'error' });
      } else {
         const updatedProject = { ...selectedProject, nonConformities: updatedNCs };
         setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
         setSelectedProject(updatedProject);
         setMessage({ text: 'Não-conformidade registrada com sucesso!', type: 'success' });

         setTimeout(() => {
            setShowNonConformityModal(false);
            setNonConformityForm({ status: 'open', reworkCost: 0 });
            setMessage(null);
         }, 1500);
      }
   };


   return (
      <div className="space-y-8 pb-12 animate-in fade-in duration-500 relative">
         {/* Global Message Banner */}
         {message && (
            <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-2xl font-black text-sm shadow-2xl animate-in slide-in-from-top-8 duration-300 flex items-center gap-3 border ${message.type === 'success'
               ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800'
               : 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800'
               }`}>
               {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
               {message.text}
            </div>
         )}

         {!selectedProject ? (
            <>
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div>
                     <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Portfólio de Obras</h1>
                     <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Controle técnico e fiscal integrado.</p>
                  </div>
                  <button
                     onClick={() => setShowCreateModal(true)}
                     className="px-6 py-4 bg-teal-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-700 transition-all shadow-xl flex items-center gap-2"
                  >
                     <Plus size={18} /> Nova Obra
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {projects.map(project => (
                     <div key={project.id} onClick={() => setSelectedProject(project)} className="group bg-white dark:bg-gray-900 rounded-[40px] p-8 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-teal-200 transition-all cursor-pointer flex flex-col">
                        <div className="flex items-start justify-between mb-8">
                           <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-[22px] flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all"><Hammer size={28} /></div>
                        </div>
                        <div className="mb-8">
                           <div className="flex justify-between items-center mb-1">
                              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{project.clientName}</p>
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(createWhatsappLink('11999999999', `Olá ${project.clientName}, sobre sua obra *${project.name}*...`), '_blank');
                                 }}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-emerald-500 hover:scale-110"
                                 title="WhatsApp Rápido"
                              >
                                 <MessageCircle size={16} />
                              </button>
                           </div>
                           <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{project.name}</h3>
                        </div>
                        <div className="mt-auto pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-teal-600 font-black text-[10px] uppercase tracking-widest">
                           <span>Gerenciar Obra</span>
                           <ChevronRight size={18} />
                        </div>
                     </div>
                  ))}
               </div>
            </>
         ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-gray-400 hover:text-teal-600 transition-colors font-black uppercase text-[10px] tracking-widest"><ArrowLeft size={16} /> Voltar</button>
                  <div className="flex gap-2">
                     <button onClick={() => setShowFiscalModal(true)} className="px-5 py-3 bg-white dark:bg-gray-800 border border-teal-100 dark:border-teal-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-teal-600 flex items-center gap-2 hover:bg-teal-50 transition-all">
                        <CloudDownload size={16} /> Buscar NF (Campo Grande)
                     </button>
                     <button onClick={() => setShowBatchModal(true)} className="px-5 py-3 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                        <Receipt size={16} /> Lançamento em Lote
                     </button>
                  </div>
               </div>

               <div className="bg-white dark:bg-gray-900 rounded-[48px] p-10 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden relative">
                  <div className="flex items-center gap-6 mb-10">
                     <div className="w-20 h-20 bg-teal-600 rounded-[28px] flex items-center justify-center text-white shadow-2xl"><Hammer size={32} /></div>
                     <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{selectedProject.name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="px-4 py-1.5 bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-full text-[10px] font-black uppercase tracking-widest">Cliente: {selectedProject.clientName}</span>
                           <button
                              onClick={() => window.open(createWhatsappLink('11999999999', `Olá ${selectedProject.clientName}, atualizações sobre a obra *${selectedProject.name}*.`), '_blank')}
                              className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="Contatar via WhatsApp"
                           >
                              <MessageCircle size={14} />
                           </button>
                        </div>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[32px]"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Budget Contratado</p><p className="text-2xl font-black text-gray-900 dark:text-white">R$ {selectedProject.totalBudget.toLocaleString('pt-BR')}</p></div>
                     <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-[32px]"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Lançado</p><p className="text-2xl font-black text-rose-600">R$ {resumo?.custosPlanejados.toLocaleString('pt-BR')}</p></div>
                     <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-[32px] border border-emerald-100 dark:border-emerald-800"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Lucro Estimado</p><p className="text-2xl font-black text-emerald-600">R$ {resumo?.margemPlanejada.toLocaleString('pt-BR')}</p></div>
                     <div className="p-6 bg-teal-50 dark:bg-teal-900/10 rounded-[32px] border border-teal-100 dark:border-teal-800"><p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Markup Real</p><p className="text-2xl font-black text-teal-600">{resumo && resumo.custosPlanejados > 0 ? ((resumo.margemPlanejada / resumo.custosPlanejados) * 100).toFixed(1) : '0'}%</p></div>
                  </div>
               </div>

               <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">Histórico de Custos Realizados</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="border-b border-gray-50 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              <th className="px-4 py-4">Data</th>
                              <th className="px-4 py-4">Descrição / Fornecedor</th>
                              <th className="px-4 py-4 text-center">Quant.</th>
                              <th className="px-4 py-4 text-right">Custo Total</th>
                           </tr>
                        </thead>
                     </table>
                     <div className="flex border-b border-gray-100 dark:border-gray-800 mb-8 mt-4">
                        <button
                           onClick={() => setActiveTab('overview')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'overview' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Visão Geral
                           {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('timeline')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'timeline' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Plano de Execução
                           {activeTab === 'timeline' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('diary')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'diary' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Diário de Obra
                           {activeTab === 'diary' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('finance')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'finance' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Financeiro
                           {activeTab === 'finance' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('quality')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'quality' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Qualidade & Vistorias
                           {activeTab === 'quality' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                     </div>
                     {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <div className="flex items-center justify-between gap-4">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Operação</p>
                                    <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Resumo de execução</h3>
                                    <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Acompanhe o avanço físico, próximos marcos e saúde financeira da obra.</p>
                                 </div>
                                 <button
                                    onClick={() => setActiveTab('timeline')}
                                    className="rounded-2xl bg-teal-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700"
                                 >
                                    Ver plano
                                 </button>
                              </div>

                              <div className="mt-6 grid gap-4 md:grid-cols-4">
                                 <div className="rounded-3xl bg-white p-5 dark:bg-gray-900">
                                    <CalendarDays size={22} className="text-teal-600" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cronograma</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{scheduleProgress}%</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">{scheduleCompleted} de {selectedProjectSchedule.length} etapas concluídas</p>
                                 </div>
                                 <div className="rounded-3xl bg-white p-5 dark:bg-gray-900">
                                    <DollarSign size={22} className="text-emerald-600" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Realizado</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">R$ {resumo?.custosReais.toLocaleString('pt-BR')}</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">Custos pagos ou confirmados</p>
                                 </div>
                                 <div className="rounded-3xl bg-white p-5 dark:bg-gray-900">
                                    <ClipboardCheck size={22} className="text-rose-500" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pendências</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{(selectedProject.nonConformities || []).filter(item => item.status !== 'resolved').length}</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">Não-conformidades abertas</p>
                                 </div>
                                 <div className="rounded-3xl bg-white p-5 dark:bg-gray-900">
                                    <ClipboardCheck size={22} className="text-sky-600" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Diários</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{selectedProjectReports.length}</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">{latestDailyReport ? `Último em ${new Date(`${latestDailyReport.reportDate}T00:00:00`).toLocaleDateString()}` : 'Nenhum registro ainda'}</p>
                                 </div>
                              </div>
                           </div>

                           <aside className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Próximo marco</p>
                              <h4 className="mt-3 text-xl font-black text-gray-900 dark:text-white">{nextScheduleEvent?.title || 'Plano ainda não criado'}</h4>
                              <p className="mt-2 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                                 {nextScheduleEvent
                                    ? `${new Date(`${nextScheduleEvent.startDate}T00:00:00`).toLocaleDateString()} até ${new Date(`${nextScheduleEvent.endDate}T00:00:00`).toLocaleDateString()}`
                                    : 'Gere o roteiro padrão para organizar as etapas principais da obra.'}
                              </p>
                              <button
                                 onClick={handleCreateExecutionPlan}
                                 disabled={isCreatingPlan}
                                 className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-gray-950"
                              >
                                 <PlayCircle size={16} />
                                 {isCreatingPlan ? 'Gerando...' : 'Gerar roteiro padrão'}
                              </button>
                           </aside>
                        </div>
                     )}

                     {activeTab === 'timeline' && (
                        <div className="grid gap-6 lg:grid-cols-[1fr_320px] animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Cronograma operacional</p>
                                    <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Plano de execução da obra</h3>
                                    <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Organize as etapas que precisam acontecer depois do aceite comercial.</p>
                                 </div>
                                 <button
                                    onClick={handleCreateExecutionPlan}
                                    disabled={isCreatingPlan}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:opacity-60"
                                 >
                                    <PlayCircle size={16} />
                                    {isCreatingPlan ? 'Gerando...' : 'Gerar roteiro'}
                                 </button>
                              </div>

                              <div className="mt-6 space-y-3">
                                 {selectedProjectSchedule.length ? (
                                    selectedProjectSchedule.map((event, index) => (
                                       <div key={event.id} className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                             <div className="flex gap-4">
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black ${
                                                   event.status === 'completed'
                                                      ? 'bg-emerald-500 text-white'
                                                      : event.status === 'delayed'
                                                         ? 'bg-rose-500 text-white'
                                                         : 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300'
                                                }`}>
                                                   {event.status === 'completed' ? <Check size={18} /> : index + 1}
                                                </div>
                                                <div>
                                                   <h4 className="font-black text-gray-900 dark:text-white">{event.title}</h4>
                                                   <p className="mt-1 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{event.description}</p>
                                                   <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                      {new Date(`${event.startDate}T00:00:00`).toLocaleDateString()} - {new Date(`${event.endDate}T00:00:00`).toLocaleDateString()}
                                                   </p>
                                                </div>
                                             </div>
                                             <div className="flex shrink-0 gap-2">
                                                <button
                                                   onClick={() => handleUpdateScheduleStatus(event, event.status === 'completed' ? 'on-track' : 'completed')}
                                                   className="rounded-xl bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300"
                                                >
                                                   {event.status === 'completed' ? 'Reabrir' : 'Concluir'}
                                                </button>
                                                {event.status !== 'completed' && (
                                                   <button
                                                      onClick={() => handleUpdateScheduleStatus(event, event.status === 'delayed' ? 'on-track' : 'delayed')}
                                                      className="rounded-xl bg-rose-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300"
                                                   >
                                                      {event.status === 'delayed' ? 'Normalizar' : 'Atraso'}
                                                   </button>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    ))
                                 ) : (
                                    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                                       <CalendarDays size={34} className="mx-auto text-gray-300" />
                                       <p className="mt-4 font-black text-gray-900 dark:text-white">Nenhuma etapa criada</p>
                                       <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Gere o roteiro padrão para iniciar o acompanhamento operacional desta obra.</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           <aside className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Avanço físico</p>
                              <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{scheduleProgress}%</p>
                              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white dark:bg-gray-950">
                                 <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${scheduleProgress}%` }} />
                              </div>
                              <p className="mt-4 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                                 {selectedProjectSchedule.length
                                    ? `${scheduleCompleted} de ${selectedProjectSchedule.length} etapas concluídas.`
                                    : 'O progresso aparecerá quando o roteiro da obra for criado.'}
                              </p>
                           </aside>
                        </div>
                     )}

                     {activeTab === 'diary' && (
                        <div className="grid gap-6 lg:grid-cols-[420px_1fr] animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Registro de campo</p>
                              <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Novo diário de obra</h3>
                              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Registre evolução, equipe, pendências e próximos passos.</p>

                              <div className="mt-6 space-y-4">
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data</label>
                                       <input
                                          type="date"
                                          value={dailyReportForm.reportDate}
                                          onChange={(e) => setDailyReportForm({ ...dailyReportForm, reportDate: e.target.value })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status</label>
                                       <select
                                          value={dailyReportForm.status}
                                          onChange={(e) => setDailyReportForm({ ...dailyReportForm, status: e.target.value as DailyReport['status'] })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       >
                                          <option value="em_andamento">Em andamento</option>
                                          <option value="concluido">Concluído</option>
                                          <option value="parcial">Parcial</option>
                                          <option value="bloqueado">Bloqueado</option>
                                       </select>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Clima</label>
                                       <select
                                          value={dailyReportForm.weather}
                                          onChange={(e) => setDailyReportForm({ ...dailyReportForm, weather: e.target.value as DailyReport['weather'] })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       >
                                          <option value="nao_informado">Não informado</option>
                                          <option value="sol">Sol</option>
                                          <option value="nublado">Nublado</option>
                                          <option value="chuva">Chuva</option>
                                          <option value="interrompido">Interrompido</option>
                                       </select>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Equipe</label>
                                       <input
                                          value={dailyReportForm.workforce}
                                          onChange={(e) => setDailyReportForm({ ...dailyReportForm, workforce: e.target.value })}
                                          placeholder="Ex: pedreiro, pintor..."
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Atividades realizadas</label>
                                    <textarea
                                       value={dailyReportForm.activities}
                                       onChange={(e) => setDailyReportForm({ ...dailyReportForm, activities: e.target.value })}
                                       placeholder="Descreva o que foi executado hoje..."
                                       className="mt-2 h-28 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pendências / bloqueios</label>
                                    <textarea
                                       value={dailyReportForm.blockers}
                                       onChange={(e) => setDailyReportForm({ ...dailyReportForm, blockers: e.target.value })}
                                       placeholder="Itens pendentes, decisões do cliente, atrasos..."
                                       className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Próximos passos</label>
                                    <textarea
                                       value={dailyReportForm.nextSteps}
                                       onChange={(e) => setDailyReportForm({ ...dailyReportForm, nextSteps: e.target.value })}
                                       placeholder="O que será feito na próxima visita ou etapa..."
                                       className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fotos / links</label>
                                    <textarea
                                       value={dailyReportForm.photosText}
                                       onChange={(e) => setDailyReportForm({ ...dailyReportForm, photosText: e.target.value })}
                                       placeholder="Cole um link por linha. Upload direto fica para a próxima etapa."
                                       className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <button
                                    onClick={handleSaveDailyReport}
                                    disabled={!dailyReportForm.activities.trim() || isSavingDailyReport}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                 >
                                    {isSavingDailyReport ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {isSavingDailyReport ? 'Salvando...' : 'Salvar diário'}
                                 </button>
                              </div>
                           </div>

                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Histórico</p>
                                    <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Relatórios de andamento</h3>
                                 </div>
                                 <span className="rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-900">
                                    {selectedProjectReports.length} registros
                                 </span>
                              </div>

                              <div className="mt-6 rounded-3xl border border-teal-100 bg-teal-50 p-5 dark:border-teal-900/50 dark:bg-teal-950/20">
                                 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-4">
                                       <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white">
                                          <FileText size={22} />
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Cliente</p>
                                          <h4 className="mt-1 text-lg font-black text-gray-900 dark:text-white">Relatório de andamento</h4>
                                          <p className="mt-1 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                                             Gere uma atualização limpa com avanço, atividades, pendências e próximos passos.
                                          </p>
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                       <select
                                          value={clientReportDays}
                                          onChange={(e) => setClientReportDays(e.target.value as typeof clientReportDays)}
                                          className="rounded-2xl border border-teal-100 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-700 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-gray-200"
                                       >
                                          <option value="7">Últimos 7 dias</option>
                                          <option value="15">Últimos 15 dias</option>
                                          <option value="30">Últimos 30 dias</option>
                                          <option value="all">Todo histórico</option>
                                       </select>
                                       <button
                                          onClick={handleCopyClientProgressReport}
                                          disabled={!selectedProjectReports.length}
                                          className="rounded-2xl bg-gray-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950"
                                       >
                                          Copiar relatório
                                       </button>
                                       <button
                                          onClick={handleSendClientProgressWhatsapp}
                                          disabled={!selectedProjectReports.length}
                                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                       >
                                          <MessageCircle size={15} />
                                          WhatsApp
                                       </button>
                                    </div>
                                 </div>
                                 <p className="mt-4 text-xs font-bold text-teal-700 dark:text-teal-300">
                                    {clientReportWindowReports.length} registro(s) considerados em {clientReportPeriodLabel}.
                                 </p>
                              </div>

                              <div className="mt-6 space-y-4">
                                 {selectedProjectReports.length ? (
                                    selectedProjectReports.map(report => (
                                       <article key={report.id} className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                             <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                   <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                                      {new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}
                                                   </span>
                                                   <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-800">
                                                      {report.status.replace('_', ' ')}
                                                   </span>
                                                   <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                                                      {report.weather.replace('_', ' ')}
                                                   </span>
                                                </div>
                                                {report.workforce && <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Equipe: {report.workforce}</p>}
                                                <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-gray-700 dark:text-gray-200">{report.activities}</p>
                                                {report.blockers && (
                                                   <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                                                      <p className="text-[10px] font-black uppercase tracking-widest">Pendências</p>
                                                      <p className="mt-1 whitespace-pre-line text-sm font-semibold">{report.blockers}</p>
                                                   </div>
                                                )}
                                                {report.nextSteps && (
                                                   <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                                      <p className="text-[10px] font-black uppercase tracking-widest">Próximos passos</p>
                                                      <p className="mt-1 whitespace-pre-line text-sm font-semibold">{report.nextSteps}</p>
                                                   </div>
                                                )}
                                                {report.photos.length > 0 && (
                                                   <div className="mt-4 flex flex-wrap gap-2">
                                                      {report.photos.map((photo, index) => (
                                                         <a key={`${report.id}-${photo}`} href={photo} target="_blank" rel="noreferrer" className="rounded-xl bg-gray-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                                                            Foto {index + 1}
                                                         </a>
                                                      ))}
                                                   </div>
                                                )}
                                             </div>
                                             <button
                                                onClick={() => handleCopyDailyReportSummary(report)}
                                                className="shrink-0 rounded-2xl bg-gray-950 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950"
                                             >
                                                Copiar
                                             </button>
                                          </div>
                                       </article>
                                    ))
                                 ) : (
                                    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                                       <ClipboardCheck size={34} className="mx-auto text-gray-300" />
                                       <p className="mt-4 font-black text-gray-900 dark:text-white">Nenhum diário registrado</p>
                                       <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Crie o primeiro relatório para documentar o andamento da obra.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'quality' && (
                        <div className="space-y-8 animate-in fade-in duration-300">

                           <div className="flex justify-between items-center">
                              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><ClipboardCheck className="text-teal-600" /> Vistorias & Qualidade</h3>
                              <div className="flex gap-2">
                                 <button onClick={() => setShowNonConformityModal(true)} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 flex items-center gap-2 transition-all"><AlertTriangle size={14} /> Reportar Problema</button>
                                 <button onClick={() => setShowInspectionModal(true)} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 flex items-center gap-2 transition-all shadow-lg shadow-teal-200 dark:shadow-none"><Plus size={14} /> Nova Vistoria</button>
                              </div>
                           </div>

                           {/* Resumo de Qualidade */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-teal-50 dark:bg-teal-900/10 rounded-[32px] border border-teal-100 dark:border-teal-800">
                                 <h4 className="text-[10px] font-black text-teal-900 dark:text-teal-300 uppercase tracking-widest mb-4">Histórico de Vistorias</h4>
                                 <div className="space-y-3">
                                    {(selectedProject.inspections || []).length === 0 ? <p className="text-sm text-gray-400 italic">Nenhuma vistoria realizada.</p> :
                                       (selectedProject.inspections || []).map(insp => (
                                          <div key={insp.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                             <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${insp.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                   {insp.status === 'approved' ? <Check size={14} /> : <X size={14} />}
                                                </div>
                                                <div>
                                                   <p className="text-xs font-bold text-gray-900 dark:text-white">{INSPECTION_TEMPLATES.find(t => t.id === insp.templateId)?.name || 'Vistoria'}</p>
                                                   <p className="text-[9px] text-gray-400 uppercase">{new Date(insp.date).toLocaleDateString()}</p>
                                                </div>
                                             </div>
                                          </div>
                                       ))
                                    }
                                 </div>
                              </div>

                              <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[32px] border border-rose-100 dark:border-rose-800">
                                 <h4 className="text-[10px] font-black text-rose-900 dark:text-rose-300 uppercase tracking-widest mb-4">Mural de Não-Conformidades</h4>
                                 <div className="space-y-3">
                                    {(selectedProject.nonConformities || []).length === 0 ? <p className="text-sm text-gray-400 italic">Nenhum problema reportado.</p> :
                                       (selectedProject.nonConformities || []).map(nc => (
                                          <div key={nc.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 border-rose-500">
                                             <p className="text-xs font-bold text-gray-900 dark:text-white">{nc.description}</p>
                                             <div className="flex justify-between items-center mt-2">
                                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Custo: R$ {nc.reworkCost}</span>
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-bold uppercase">{nc.status}</span>
                                             </div>
                                          </div>
                                       ))
                                    }
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}
                     {activeTab === 'finance' && (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="border-b border-gray-50 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-4 py-4">Data</th>
                                    <th className="px-4 py-4">Descrição / Fornecedor</th>
                                    <th className="px-4 py-4 text-center">Quant.</th>
                                    <th className="px-4 py-4 text-right">Custo Total</th>
                                 </tr>
                              </thead>
                           </table>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* --- MODAIS DO SISTEMA --- */}

         {/* MODAL BUSCA FISCAL CAMPO GRANDE */}
         {showFiscalModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 backdrop-blur-xl">
               <div className="bg-white dark:bg-gray-950 rounded-[48px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-teal-50/50 dark:bg-teal-900/20">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><CloudDownload size={28} /></div>
                        <div>
                           <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">API Fiscal Campo Grande</h2>
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Sincronização Direta com a SEFIN MS</p>
                        </div>
                     </div>
                     <button onClick={() => setShowFiscalModal(false)} className="p-4 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl transition-all"><X size={24} /></button>
                  </div>
                  <div className="p-10 space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ do Prestador</label>
                           <input type="text" value={fiscalParams.cnpjPrestador} onChange={(e) => setFiscalParams({ ...fiscalParams, cnpjPrestador: e.target.value })} placeholder="00.000.000/0001-00" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número da Nota</label>
                           <input type="text" value={fiscalParams.numeroNota} onChange={(e) => setFiscalParams({ ...fiscalParams, numeroNota: e.target.value })} placeholder="Ex: 2024" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código de Verificação (Autenticidade)</label>
                        <input type="text" value={fiscalParams.codigoVerificacao} onChange={(e) => setFiscalParams({ ...fiscalParams, codigoVerificacao: e.target.value })} placeholder="Ex: A1B2-C3D4" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold uppercase" />
                     </div>
                     <div className="p-6 bg-teal-50 dark:bg-teal-900/10 rounded-3xl border border-teal-100 dark:border-teal-800 flex items-start gap-4">
                        <Building size={20} className="text-teal-600 shrink-0" />
                        <p className="text-xs font-bold text-teal-900 dark:text-teal-300 leading-relaxed italic">
                           Dica: Você pode encontrar esses dados no rodapé da NFS-e ou no portal nfse.pmcg.ms.gov.br. A importação irá converter o valor total da nota em um custo realizado para este projeto.
                        </p>
                     </div>
                     <div className="flex gap-4 pt-6">
                        <button onClick={() => setShowFiscalModal(false)} className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button
                           onClick={handleFetchFiscal}
                           disabled={isFetchingFiscal}
                           className="flex-1 py-5 bg-teal-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                           {isFetchingFiscal ? <Loader2 className="animate-spin" size={18} /> : <CloudDownload size={18} />}
                           {isFetchingFiscal ? 'Conectando SEFIN...' : 'Sincronizar Nota Fiscal'}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL LANÇAMENTO EM LOTE */}
         {showBatchModal && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4 backdrop-blur-xl">
               <div className="bg-white dark:bg-gray-950 rounded-[48px] w-full max-w-5xl max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 flex flex-col">
                  <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 rounded-t-[48px]">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-xl"><Receipt size={28} /></div>
                        <div><h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Check-out de Nota Fiscal</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Multi-lançamento para o projeto {selectedProject?.name}</p></div>
                     </div>
                     <button onClick={() => setShowBatchModal(false)} className="p-4 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl transition-all"><X size={24} /></button>
                  </div>
                  <BatchForm onSave={handleSaveBatch} onCancel={() => setShowBatchModal(false)} />
               </div>
            </div>
         )}

         {/* Modal Nova Vistoria */}
         {showInspectionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
               <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                     <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <ClipboardCheck className="text-teal-600" /> Nova Vistoria
                     </h3>
                     <button onClick={() => setShowInspectionModal(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all">
                        <X size={20} className="text-gray-400" />
                     </button>
                  </div>

                  <div className="p-8 overflow-y-auto flex-1 space-y-8">
                     {!selectedTemplate ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {INSPECTION_TEMPLATES.map(tpl => (
                              <button
                                 key={tpl.id}
                                 onClick={() => setSelectedTemplate(tpl)}
                                 className="p-6 text-left bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent hover:border-teal-500 hover:shadow-lg transition-all group"
                              >
                                 <h4 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-teal-600">{tpl.name}</h4>
                                 <p className="text-xs text-gray-500 dark:text-gray-400">{tpl.description}</p>
                              </button>
                           ))}
                        </div>
                     ) : (
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <h4 className="font-black text-lg text-teal-900 dark:text-teal-300">{selectedTemplate.name}</h4>
                              <button onClick={() => setSelectedTemplate(null)} className="text-xs font-bold text-gray-400 hover:text-teal-600 underline">Alterar Template</button>
                           </div>

                           <div className="space-y-3">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Checklist</p>
                              {selectedTemplate.items.map(item => (
                                 <label key={item} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${currentInspectionItems.includes(item) ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 dark:border-gray-600'
                                       }`}>
                                       {currentInspectionItems.includes(item) && <Check size={12} />}
                                    </div>
                                    <input
                                       type="checkbox"
                                       className="hidden"
                                       checked={currentInspectionItems.includes(item)}
                                       onChange={(e) => {
                                          if (e.target.checked) setCurrentInspectionItems([...currentInspectionItems, item]);
                                          else setCurrentInspectionItems(currentInspectionItems.filter(i => i !== item));
                                       }}
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item}</span>
                                 </label>
                              ))}
                           </div>

                           <div>
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Evidência Fotográfica</p>
                              <label className="block w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all text-gray-400 hover:text-teal-500 relative overflow-hidden">
                                 {inspectionPhoto ? (
                                    <img src={inspectionPhoto} alt="Preview" className="w-full h-full object-cover" />
                                 ) : (
                                    <>
                                       <Camera size={24} className="mb-2" />
                                       <span className="text-xs font-bold uppercase">Tirar Foto / Upload</span>
                                    </>
                                 )}
                                 <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'inspection')} />
                              </label>
                           </div>
                        </div>
                     )}
                  </div>

                  {selectedTemplate && (
                     <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 grid grid-cols-2 gap-4">
                        <button
                           onClick={() => handleCreateInspection('rejected')}
                           className="py-3 bg-white dark:bg-gray-900 border border-rose-200 text-rose-600 rounded-xl font-black uppercase tracking-widest hover:bg-rose-50 transition-colors shadow-sm"
                        >
                           Reprovar
                        </button>
                        <button
                           onClick={() => handleCreateInspection('approved')}
                           className="py-3 bg-teal-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                           disabled={currentInspectionItems.length === 0}
                        >
                           Aprovar Vistoria
                        </button>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Modal Nova Não-Conformidade */}
         {showNonConformityModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
               <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10">
                     <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="text-rose-500" /> Reportar Problema (NC)
                     </h3>
                     <button onClick={() => setShowNonConformityModal(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all">
                        <X size={20} className="text-gray-400" />
                     </button>
                  </div>

                  <div className="p-8 space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Descrição do Problema</label>
                        <textarea
                           className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-medium text-gray-700 dark:text-gray-200 resize-none h-24"
                           placeholder="Descreva o que está fora do padrão..."
                           value={nonConformityForm.description || ''}
                           onChange={(e) => setNonConformityForm({ ...nonConformityForm, description: e.target.value })}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Custo de Retrabalho (R$)</label>
                           <div className="relative">
                              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                 type="number"
                                 className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold text-gray-900 dark:text-white outline-none"
                                 placeholder="0,00"
                                 value={nonConformityForm.reworkCost || ''}
                                 onChange={(e) => setNonConformityForm({ ...nonConformityForm, reworkCost: Number(e.target.value) })}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Responsável</label>
                           <input
                              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl font-bold text-gray-900 dark:text-white outline-none"
                              placeholder="Nome"
                              value={nonConformityForm.responsible || ''}
                              onChange={(e) => setNonConformityForm({ ...nonConformityForm, responsible: e.target.value })}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Foto da Evidência</label>
                        <label className="w-full h-24 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-transparent hover:border-rose-300 transition-all overflow-hidden relative">
                           {nonConformityForm.photo ? (
                              <img src={nonConformityForm.photo} className="w-full h-full object-cover" alt="Evidência" />
                           ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                 <Camera size={20} />
                                 <span className="text-[10px] font-bold uppercase mt-1">Adicionar Foto</span>
                              </div>
                           )}
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'nc')} />
                        </label>
                     </div>

                     <button
                        onClick={handleCreateNonConformity}
                        disabled={!nonConformityForm.description}
                        className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        Registrar Problema
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Modal Nova Obra */}
         {showCreateModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
               <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                  <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                     <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Nova Obra</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Inicie o gerenciamento de um projeto</p>
                     </div>
                     <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all">
                        <X size={20} className="text-gray-400" />
                     </button>
                  </div>

                  <div className="p-8 space-y-6">
                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Nome do Projeto / Obra</label>
                        <input
                           type="text"
                           placeholder="Ex: Reforma Apartamento 101"
                           className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500/20"
                           value={newProjectForm.name}
                           onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                           autoFocus
                        />
                     </div>

                     <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cliente</label>
                        {newProjectForm.clientId ? (
                           // Modo: Cliente já vinculado (Redirect)
                           <div className="relative">
                              <input
                                 type="text"
                                 className="w-full px-5 py-4 bg-gray-100 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-gray-500 cursor-not-allowed"
                                 value={newProjectForm.clientName}
                                 readOnly
                              />
                              <button
                                 onClick={() => setNewProjectForm(prev => ({ ...prev, clientId: '', clientName: '' }))}
                                 className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 hover:text-teal-800"
                              >
                                 Trocar
                              </button>
                           </div>
                        ) : (
                           // Modo: Seleção de Cliente
                           <select
                              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500/20 appearance-none"
                              value={newProjectForm.clientId}
                              onChange={(e) => {
                                 const selectedClient = clients.find(c => c.id === e.target.value);
                                 if (selectedClient) {
                                    setNewProjectForm(prev => ({
                                       ...prev,
                                       clientId: selectedClient.id,
                                       clientName: selectedClient.nome
                                    }));
                                 }
                              }}
                           >
                              <option value="">Selecione um Cliente...</option>
                              {clients.map(client => (
                                 <option key={client.id} value={client.id}>{client.nome}</option>
                              ))}
                           </select>
                        )}
                        {!newProjectForm.clientId && (
                           <p className="text-[10px] text-gray-400 font-bold mt-2 flex items-center gap-1">
                              <Info size={12} /> Selecione o cliente para vincular à obra.
                           </p>
                        )}
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Budget (R$)</label>
                           <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                              <input
                                 type="text"
                                 className="w-full pl-10 pr-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-gray-900 dark:text-gray-100 placeholder-gray-300"
                                 placeholder="0,00"
                                 value={newProjectForm.totalBudget ? newProjectForm.totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                                 onChange={(e) => {
                                    const formatted = formatInputCurrency(e.target.value);
                                    // Set raw value for calculation, but we control display via value prop + toLocaleString
                                    // Parse back to number: 1.234,56 -> 1234.56
                                    const rawValue = parseCurrency(formatted);
                                    setNewProjectForm({ ...newProjectForm, totalBudget: rawValue });
                                 }}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Data Início</label>
                           <input
                              type="date"
                              className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none font-bold text-gray-900 dark:text-gray-100"
                              value={newProjectForm.startDate}
                              onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                           />
                        </div>
                     </div>

                     <button
                        onClick={handleCreateProject}
                        disabled={!newProjectForm.name || !newProjectForm.clientName}
                        className="w-full py-5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                     >
                        Criar Obra e Começar
                     </button>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default Projects;
