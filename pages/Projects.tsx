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
   Printer,
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
   taskIds: string[];
   completedTaskIds: string[];
   sharedWithClient: boolean;
   createdAt: string;
}

interface DailyPhotoPreview {
   id: string;
   file: File;
   url: string;
}

interface ExecutionTask {
   id: string;
   projectId: string;
   scheduleEventId?: string;
   title: string;
   description?: string;
   phase: string;
   responsible?: string;
   dueDate?: string;
   priority: 'low' | 'medium' | 'high';
   status: 'todo' | 'in_progress' | 'done' | 'blocked';
   completedAt?: string;
   createdAt: string;
}

type ProjectDocumentCategory =
   | 'alvaras_licencas'
   | 'contratos'
   | 'art_rrt'
   | 'projetos_executivos'
   | 'laudos_tecnicos'
   | 'certificados_garantia'
   | 'notas_fiscais'
   | 'garantias_manuais'
   | 'entrega_obra';

interface ProjectDocument {
   id: string;
   projectId?: string;
   clientId?: string;
   category: ProjectDocumentCategory;
   name: string;
   description?: string;
   filePath?: string;
   fileType?: string;
   fileSize: number;
   uploadedAt: string;
   validUntil?: string;
   validityStatus: 'valido' | 'proximo_vencimento' | 'vencido';
}

interface ProjectTeamMember {
   id: string;
   projectId: string;
   prestadorId?: string;
   name: string;
   role: string;
   phone?: string;
   email?: string;
   notes?: string;
   isPrimary: boolean;
   createdAt: string;
}

interface ProjectMessage {
   id: string;
   projectId: string;
   teamMemberId?: string;
   recipientName: string;
   recipientPhone?: string;
   channel: 'whatsapp';
   template: string;
   message: string;
   sentAt: string;
}

interface PrestadorOption {
   id: string;
   nome: string;
   ramoAtividade: string;
   categoriaProfissional: string;
   email?: string;
   telefoneCelular?: string;
}

const MESSAGE_TEMPLATES = [
   {
      value: 'livre',
      label: 'Mensagem livre',
      text: 'Olá, tudo bem? Segue atualização sobre a obra.'
   },
   {
      value: 'visita_agendada',
      label: 'Visita agendada',
      text: 'Olá, temos uma visita/atividade agendada na obra. Por favor confirme disponibilidade e acesso ao local.'
   },
   {
      value: 'pendencia_material',
      label: 'Pendência de material',
      text: 'Olá, precisamos de atenção para uma pendência de material na obra. Por favor verifique e nos retorne.'
   },
   {
      value: 'atraso_etapa',
      label: 'Atraso de etapa',
      text: 'Olá, identificamos risco de atraso em uma etapa da obra. Precisamos alinhar as ações para normalizar o cronograma.'
   },
   {
      value: 'liberacao_etapa',
      label: 'Liberação de etapa',
      text: 'Olá, a etapa foi liberada para continuidade. Por favor siga com a próxima atividade conforme combinado.'
   },
   {
      value: 'documento_pendente',
      label: 'Documento pendente',
      text: 'Olá, existe um documento pendente relacionado à obra. Por favor providencie ou confirme o envio.'
   }
];

const PROJECT_DOCUMENT_CATEGORIES: { value: ProjectDocumentCategory; label: string; description: string }[] = [
   { value: 'contratos', label: 'Contrato', description: 'Contrato, aditivo ou termo assinado.' },
   { value: 'art_rrt', label: 'ART / RRT', description: 'Responsabilidade técnica e registros profissionais.' },
   { value: 'alvaras_licencas', label: 'Alvarás', description: 'Licenças, autorizações e documentos legais.' },
   { value: 'projetos_executivos', label: 'Projetos', description: 'Plantas, memoriais e arquivos executivos.' },
   { value: 'laudos_tecnicos', label: 'Laudos', description: 'Relatórios técnicos, inspeções e pareceres.' },
   { value: 'notas_fiscais', label: 'Notas fiscais', description: 'Notas, recibos e comprovantes fiscais.' },
   { value: 'garantias_manuais', label: 'Garantias', description: 'Garantias, manuais e certificados de produto.' },
   { value: 'entrega_obra', label: 'Entrega', description: 'Termo de entrega, fotos finais e aceite.' },
   { value: 'certificados_garantia', label: 'Certificados', description: 'Certificados e garantias formais.' }
];

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

const sanitizeFileName = (fileName: string) => fileName
   .normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '')
   .replace(/[^a-zA-Z0-9._-]/g, '-')
   .replace(/-+/g, '-')
   .toLowerCase();

const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
   let timeoutId: ReturnType<typeof setTimeout> | undefined;
   const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
   });

   try {
      return await Promise.race([promise, timeoutPromise]);
   } finally {
      if (timeoutId) clearTimeout(timeoutId);
   }
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
   const [executionTasks, setExecutionTasks] = useState<ExecutionTask[]>([]);
   const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
   const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
   const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([]);
   const [prestadoresOptions, setPrestadoresOptions] = useState<PrestadorOption[]>([]);

   const [selectedProject, setSelectedProject] = useState<Project | null>(null);
   const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'tasks' | 'diary' | 'documents' | 'communication' | 'finance' | 'quality'>('overview');
   const [showBatchModal, setShowBatchModal] = useState(false);
   const [showFiscalModal, setShowFiscalModal] = useState(false);
   const [isCreatingPlan, setIsCreatingPlan] = useState(false);
   const [isSavingDailyReport, setIsSavingDailyReport] = useState(false);
   const [isSavingExecutionTask, setIsSavingExecutionTask] = useState(false);
   const [isSavingDocument, setIsSavingDocument] = useState(false);
   const [isSavingTeamMember, setIsSavingTeamMember] = useState(false);
   const [isLinkingPrestador, setIsLinkingPrestador] = useState(false);
   const [isSendingProjectMessage, setIsSendingProjectMessage] = useState(false);
   const [clientReportDays, setClientReportDays] = useState<'7' | '15' | '30' | 'all'>('7');
   const [dailyPhotoFiles, setDailyPhotoFiles] = useState<DailyPhotoPreview[]>([]);
   const [dailyPhotoUrls, setDailyPhotoUrls] = useState<Record<string, string>>({});
   const [executionTaskForm, setExecutionTaskForm] = useState({
      title: '',
      description: '',
      phase: '',
      responsible: '',
      dueDate: '',
      priority: 'medium' as ExecutionTask['priority']
   });
   const [dailyReportForm, setDailyReportForm] = useState({
      reportDate: new Date().toISOString().split('T')[0],
      weather: 'nao_informado' as DailyReport['weather'],
      status: 'em_andamento' as DailyReport['status'],
      workforce: '',
      activities: '',
      blockers: '',
      nextSteps: '',
      taskIds: [] as string[],
      completedTaskIds: [] as string[],
      photosText: ''
   });
   const [documentForm, setDocumentForm] = useState({
      category: 'contratos' as ProjectDocumentCategory,
      name: '',
      description: '',
      validUntil: ''
   });
   const [documentFile, setDocumentFile] = useState<File | null>(null);
   const [responsibleForm, setResponsibleForm] = useState({
      name: '',
      phone: ''
   });
   const [teamMemberForm, setTeamMemberForm] = useState({
      name: '',
      role: '',
      phone: '',
      email: '',
      notes: ''
   });
   const [selectedPrestadorId, setSelectedPrestadorId] = useState('');
   const [messageForm, setMessageForm] = useState({
      memberId: '',
      template: 'livre',
      message: MESSAGE_TEMPLATES[0].text
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
   const selectedProjectTasks = useMemo(() => {
      if (!selectedProject) return [];
      return executionTasks
         .filter(task => task.projectId === selectedProject.id)
         .sort((a, b) => {
            if (a.status === 'done' && b.status !== 'done') return 1;
            if (a.status !== 'done' && b.status === 'done') return -1;
            return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31');
         });
   }, [selectedProject, executionTasks]);
   const taskCompleted = selectedProjectTasks.filter(task => task.status === 'done').length;
   const taskBlocked = selectedProjectTasks.filter(task => task.status === 'blocked').length;
   const taskProgress = selectedProjectTasks.length
      ? Math.round((taskCompleted / selectedProjectTasks.length) * 100)
      : 0;
   const overdueTasks = selectedProjectTasks.filter(task => task.status !== 'done' && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0]);
   const openExecutionTasks = selectedProjectTasks.filter(task => task.status !== 'done');
   const selectedProjectDocuments = useMemo(() => {
      if (!selectedProject) return [];
      return projectDocuments
         .filter(document => document.projectId === selectedProject.id)
         .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
   }, [selectedProject, projectDocuments]);
   const documentsByCategory = PROJECT_DOCUMENT_CATEGORIES.map(category => ({
      ...category,
      count: selectedProjectDocuments.filter(document => document.category === category.value).length
   }));
   const expiredDocuments = selectedProjectDocuments.filter(document => document.validityStatus === 'vencido').length;
   const expiringDocuments = selectedProjectDocuments.filter(document => document.validityStatus === 'proximo_vencimento').length;
   const selectedProjectTeam = useMemo(() => {
      if (!selectedProject) return [];
      return teamMembers
         .filter(member => member.projectId === selectedProject.id)
         .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));
   }, [selectedProject, teamMembers]);
   const selectedProjectMessages = useMemo(() => {
      if (!selectedProject) return [];
      return projectMessages
         .filter(message => message.projectId === selectedProject.id)
         .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
   }, [selectedProject, projectMessages]);
   const availablePrestadoresForProject = useMemo(() => {
      const linkedPrestadorIds = new Set(selectedProjectTeam.map(member => member.prestadorId).filter(Boolean));
      return prestadoresOptions.filter(prestador => !linkedPrestadorIds.has(prestador.id));
   }, [prestadoresOptions, selectedProjectTeam]);
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
   const getTaskById = (taskId: string) => executionTasks.find(task => task.id === taskId);
   const toggleDailyReportTask = (taskId: string) => {
      setDailyReportForm(prev => {
         const isSelected = prev.taskIds.includes(taskId);
         return {
            ...prev,
            taskIds: isSelected
               ? prev.taskIds.filter(id => id !== taskId)
               : [...prev.taskIds, taskId],
            completedTaskIds: isSelected
               ? prev.completedTaskIds.filter(id => id !== taskId)
               : prev.completedTaskIds
         };
      });
   };
   const toggleDailyReportCompletedTask = (taskId: string) => {
      setDailyReportForm(prev => {
         const taskIds = prev.taskIds.includes(taskId) ? prev.taskIds : [...prev.taskIds, taskId];
         return {
            ...prev,
            taskIds,
            completedTaskIds: prev.completedTaskIds.includes(taskId)
               ? prev.completedTaskIds.filter(id => id !== taskId)
               : [...prev.completedTaskIds, taskId]
         };
      });
   };

   // Fetch data from Supabase
   useEffect(() => {
      if (user) {
         fetchProjects();
         fetchPrestadoresOptions();
      }
   }, [user]);

   useEffect(() => {
      if (selectedProject) {
         fetchCosts(selectedProject.id);
         fetchScheduleEvents(selectedProject.id);
         fetchDailyReports(selectedProject.id);
         fetchExecutionTasks(selectedProject.id);
         fetchProjectDocuments(selectedProject.id);
         fetchProjectTeam(selectedProject.id);
         fetchProjectMessages(selectedProject.id);
         setResponsibleForm({
            name: selectedProject.responsibleName || '',
            phone: selectedProject.responsiblePhone || ''
         });
      }
   }, [selectedProject]);

   useEffect(() => {
      const loadPhotoPreviews = async () => {
         const storedPhotos = selectedProjectReports
            .flatMap(report => report.photos)
            .filter(photo => !isExternalPhotoUrl(photo));
         const missingPhotos = storedPhotos.filter(photo => !dailyPhotoUrls[photo]);

         if (!missingPhotos.length) return;

         const entries = await Promise.all(missingPhotos.map(async (photo) => {
            try {
               return [photo, await getDailyPhotoUrl(photo)] as const;
            } catch {
               return null;
            }
         }));

         const nextUrls = Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>);
         if (Object.keys(nextUrls).length) {
            setDailyPhotoUrls(prev => ({ ...prev, ...nextUrls }));
         }
      };

      loadPhotoPreviews();
   }, [selectedProjectReports, dailyPhotoUrls]);

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
            responsibleName: p.responsible_name || '',
            responsiblePhone: p.responsible_phone || '',
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

   const fetchExecutionTasks = async (projectId: string) => {
      const { data, error } = await supabase
         .from('project_execution_tasks')
         .select('*')
         .eq('project_id', projectId)
         .order('due_date', { ascending: true, nullsFirst: false })
         .order('created_at', { ascending: false });

      if (error) {
         console.warn('Tarefas de execução indisponíveis:', error.message);
         return;
      }

      setExecutionTasks(prev => [
         ...prev.filter(task => task.projectId !== projectId),
         ...(data || []).map((task: any) => ({
            id: task.id,
            projectId: task.project_id,
            scheduleEventId: task.schedule_event_id || '',
            title: task.title,
            description: task.description || '',
            phase: task.phase || 'Geral',
            responsible: task.responsible || '',
            dueDate: task.due_date || '',
            priority: task.priority,
            status: task.status,
            completedAt: task.completed_at || '',
            createdAt: task.created_at
         }))
      ]);
   };

   const fetchProjectDocuments = async (projectId: string) => {
      const { data, error } = await supabase
         .from('documents')
         .select('*')
         .eq('project_id', projectId)
         .order('data_upload', { ascending: false });

      if (error) {
         console.warn('Dossiê de documentos indisponível:', error.message);
         return;
      }

      setProjectDocuments(prev => [
         ...prev.filter(document => document.projectId !== projectId),
         ...(data || []).map((document: any) => ({
            id: document.id,
            projectId: document.project_id || '',
            clientId: document.client_id || '',
            category: document.categoria,
            name: document.nome,
            description: document.descricao || '',
            filePath: document.arquivo_url || '',
            fileType: document.tipo_arquivo || '',
            fileSize: Number(document.tamanho_bytes || 0),
            uploadedAt: document.data_upload || document.created_at,
            validUntil: document.data_validade || '',
            validityStatus: document.status_validade || 'valido'
         }))
      ]);
   };

   const handleSaveProjectResponsible = async () => {
      if (!selectedProject) return;

      const { error } = await supabase
         .from('projects')
         .update({
            responsible_name: responsibleForm.name.trim() || null,
            responsible_phone: responsibleForm.phone.trim() || null
         })
         .eq('id', selectedProject.id);

      if (error) {
         setMessage({ text: 'Erro ao salvar responsável. Aplique a migration 00012 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
         return;
      }

      const updatedProject = {
         ...selectedProject,
         responsibleName: responsibleForm.name.trim(),
         responsiblePhone: responsibleForm.phone.trim()
      };
      setSelectedProject(updatedProject);
      setProjects(prev => prev.map(project => project.id === selectedProject.id ? updatedProject : project));
      setMessage({ text: 'Responsável da obra atualizado.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
   };

   const handleSendProjectResponsibleWhatsapp = (message: string) => {
      const phone = selectedProject?.responsiblePhone || responsibleForm.phone;
      if (!phone) {
         setMessage({ text: 'Informe o telefone do responsável da obra antes de enviar aviso.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      window.open(createWhatsappLink(phone, message), '_blank');
   };

   const fetchProjectTeam = async (projectId: string) => {
      const { data, error } = await supabase
         .from('project_team_members')
         .select('*')
         .eq('project_id', projectId)
         .order('is_primary', { ascending: false })
         .order('name', { ascending: true });

      if (error) {
         console.warn('Equipe da obra indisponível:', error.message);
         return;
      }

      setTeamMembers(prev => [
         ...prev.filter(member => member.projectId !== projectId),
         ...(data || []).map((member: any) => ({
            id: member.id,
            projectId: member.project_id,
            prestadorId: member.prestador_id || '',
            name: member.name,
            role: member.role,
            phone: member.phone || '',
            email: member.email || '',
            notes: member.notes || '',
            isPrimary: Boolean(member.is_primary),
            createdAt: member.created_at
         }))
      ]);
   };

   const fetchPrestadoresOptions = async () => {
      const { data, error } = await supabase
         .from('prestadores')
         .select('id,nome,ramo_atividade,categoria_profissional,email,telefone_celular,status_cadastro')
         .order('nome', { ascending: true });

      if (error) {
         console.warn('Prestadores indisponíveis para vínculo:', error.message);
         return;
      }

      setPrestadoresOptions((data || []).map((prestador: any) => ({
         id: prestador.id,
         nome: prestador.nome,
         ramoAtividade: prestador.ramo_atividade || '',
         categoriaProfissional: prestador.categoria_profissional || 'Prestador',
         email: prestador.email || '',
         telefoneCelular: prestador.telefone_celular || ''
      })));
   };

   const fetchProjectMessages = async (projectId: string) => {
      const { data, error } = await supabase
         .from('project_messages')
         .select('*')
         .eq('project_id', projectId)
         .order('sent_at', { ascending: false });

      if (error) {
         console.warn('Histórico de mensagens indisponível:', error.message);
         return;
      }

      setProjectMessages(prev => [
         ...prev.filter(message => message.projectId !== projectId),
         ...(data || []).map((message: any) => ({
            id: message.id,
            projectId: message.project_id,
            teamMemberId: message.team_member_id || '',
            recipientName: message.recipient_name,
            recipientPhone: message.recipient_phone || '',
            channel: message.channel,
            template: message.template,
            message: message.message,
            sentAt: message.sent_at
         }))
      ]);
   };

   const resetTeamMemberForm = () => {
      setTeamMemberForm({ name: '', role: '', phone: '', email: '', notes: '' });
   };

   const handleLinkPrestadorToProject = async () => {
      if (!selectedProject || !user?.id || !selectedPrestadorId) return;

      const prestador = prestadoresOptions.find(item => item.id === selectedPrestadorId);
      if (!prestador) return;

      if (selectedProjectTeam.some(member => member.prestadorId === prestador.id)) {
         setMessage({ text: 'Este prestador já está vinculado à equipe desta obra.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      setIsLinkingPrestador(true);
      const { error } = await supabase.from('project_team_members').insert([{
         user_id: user.id,
         project_id: selectedProject.id,
         prestador_id: prestador.id,
         name: prestador.nome,
         role: prestador.ramoAtividade || prestador.categoriaProfissional || 'Prestador',
         phone: prestador.telefoneCelular || null,
         email: prestador.email || null,
         notes: `Vinculado ao cadastro de prestadores (${prestador.categoriaProfissional || 'Prestador'}).`,
         is_primary: false
      }]);

      if (error) {
         setMessage({ text: 'Erro ao vincular prestador. Aplique a migration 00014 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
      } else {
         await fetchProjectTeam(selectedProject.id);
         setSelectedPrestadorId('');
         setMessage({ text: 'Prestador vinculado à equipe da obra.', type: 'success' });
         setTimeout(() => setMessage(null), 3000);
      }

      setIsLinkingPrestador(false);
   };

   const handleSaveTeamMember = async () => {
      if (!selectedProject || !user?.id || !teamMemberForm.name.trim()) return;

      setIsSavingTeamMember(true);
      const { error } = await supabase.from('project_team_members').insert([{
         user_id: user.id,
         project_id: selectedProject.id,
         name: teamMemberForm.name.trim(),
         role: teamMemberForm.role.trim() || 'Equipe',
         phone: teamMemberForm.phone.trim() || null,
         email: teamMemberForm.email.trim() || null,
         notes: teamMemberForm.notes.trim() || null,
         is_primary: false
      }]);

      if (error) {
         setMessage({ text: 'Erro ao salvar contato. Aplique a migration 00013 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
      } else {
         await fetchProjectTeam(selectedProject.id);
         resetTeamMemberForm();
         setMessage({ text: 'Contato adicionado à equipe da obra.', type: 'success' });
         setTimeout(() => setMessage(null), 3000);
      }

      setIsSavingTeamMember(false);
   };

   const handleRemoveTeamMember = async (member: ProjectTeamMember) => {
      if (!selectedProject) return;

      const { error } = await supabase.from('project_team_members').delete().eq('id', member.id);
      if (error) {
         setMessage({ text: 'Erro ao remover contato: ' + error.message, type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      await fetchProjectTeam(selectedProject.id);
      setMessage({ text: 'Contato removido da equipe.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
   };

   const handleMessageTemplateChange = (template: string) => {
      const templateData = MESSAGE_TEMPLATES.find(item => item.value === template) || MESSAGE_TEMPLATES[0];
      setMessageForm(prev => ({
         ...prev,
         template,
         message: templateData.text
      }));
   };

   const buildProjectMessageText = (member: ProjectTeamMember) => {
      return [
         `Olá ${member.name},`,
         '',
         messageForm.message,
         '',
         `Obra: ${selectedProject?.name}`,
         `Cliente: ${selectedProject?.clientName}`
      ].join('\n');
   };

   const handleSendProjectMessage = async () => {
      if (!selectedProject || !user?.id || !messageForm.memberId || !messageForm.message.trim()) return;

      const member = selectedProjectTeam.find(item => item.id === messageForm.memberId);
      if (!member || !member.phone) {
         setMessage({ text: 'Selecione um contato com WhatsApp cadastrado.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      setIsSendingProjectMessage(true);
      const finalMessage = buildProjectMessageText(member);
      const { error } = await supabase.from('project_messages').insert([{
         user_id: user.id,
         project_id: selectedProject.id,
         team_member_id: member.id,
         recipient_name: member.name,
         recipient_phone: member.phone,
         channel: 'whatsapp',
         template: messageForm.template,
         message: finalMessage
      }]);

      if (error) {
         setMessage({ text: 'Erro ao registrar mensagem. Aplique a migration 00013 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
         setIsSendingProjectMessage(false);
         return;
      }

      await fetchProjectMessages(selectedProject.id);
      window.open(createWhatsappLink(member.phone, finalMessage), '_blank');
      setMessage({ text: 'Mensagem registrada e WhatsApp aberto.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
      setIsSendingProjectMessage(false);
   };

   const resetDocumentForm = () => {
      setDocumentForm({
         category: 'contratos',
         name: '',
         description: '',
         validUntil: ''
      });
      setDocumentFile(null);
   };

   const getDocumentCategoryLabel = (category: ProjectDocumentCategory) =>
      PROJECT_DOCUMENT_CATEGORIES.find(item => item.value === category)?.label || category;

   const formatFileSize = (bytes: number) => {
      if (!bytes) return '0 KB';
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   };

   const getDocumentValidityStatus = (validUntil?: string): ProjectDocument['validityStatus'] => {
      if (!validUntil) return 'valido';

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(`${validUntil}T00:00:00`);
      const daysUntilExpiry = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) return 'vencido';
      if (daysUntilExpiry <= 30) return 'proximo_vencimento';
      return 'valido';
   };

   const handleSaveProjectDocument = async () => {
      if (!selectedProject || !user?.id || !documentFile) return;

      setIsSavingDocument(true);
      const fileName = documentForm.name.trim() || documentFile.name;
      const filePath = `${user.id}/${selectedProject.id}/${Date.now()}-${sanitizeFileName(documentFile.name)}`;

      try {
         const { error: uploadError } = await withTimeout(
            supabase.storage.from('project-documents').upload(filePath, documentFile, {
               cacheControl: '3600',
               upsert: false
            }),
            45000,
            'Tempo esgotado ao enviar o documento. Verifique sua conexão e tente novamente.'
         );

         if (uploadError) {
            throw new Error(uploadError.message || 'Storage recusou o envio do documento.');
         }

         const { error } = await supabase.from('documents').insert([{
            user_id: user.id,
            client_id: selectedProject.clientId || null,
            project_id: selectedProject.id,
            categoria: documentForm.category,
            nome: fileName,
            descricao: documentForm.description.trim() || null,
            arquivo_url: filePath,
            tipo_arquivo: documentFile.type || null,
            tamanho_bytes: documentFile.size,
            data_validade: documentForm.validUntil || null,
            status_validade: getDocumentValidityStatus(documentForm.validUntil)
         }]);

         if (error) {
            await supabase.storage.from('project-documents').remove([filePath]);
            throw new Error(error.message);
         }

         await fetchProjectDocuments(selectedProject.id);
         resetDocumentForm();
         setMessage({ text: 'Documento anexado ao dossiê da obra.', type: 'success' });
         setTimeout(() => setMessage(null), 3500);
      } catch (error: any) {
         setMessage({ text: `Erro ao salvar documento. Aplique a migration 00011 no Supabase. ${error?.message || ''}`, type: 'error' });
         setTimeout(() => setMessage(null), 7000);
      } finally {
         setIsSavingDocument(false);
      }
   };

   const handleOpenProjectDocument = async (document: ProjectDocument) => {
      if (!document.filePath) return;

      try {
         const { data, error } = await supabase.storage
            .from('project-documents')
            .createSignedUrl(document.filePath, 60 * 60);

         if (error || !data?.signedUrl) {
            throw new Error(error?.message || 'Não foi possível gerar link temporário.');
         }

         window.open(data.signedUrl, '_blank');
      } catch (error: any) {
         setMessage({ text: 'Erro ao abrir documento: ' + (error?.message || 'link indisponível'), type: 'error' });
         setTimeout(() => setMessage(null), 4500);
      }
   };

   const handleDeleteProjectDocument = async (document: ProjectDocument) => {
      if (!selectedProject) return;

      const { error } = await supabase.from('documents').delete().eq('id', document.id);
      if (error) {
         setMessage({ text: 'Erro ao excluir documento: ' + error.message, type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      if (document.filePath) {
         await supabase.storage.from('project-documents').remove([document.filePath]);
      }

      await fetchProjectDocuments(selectedProject.id);
      setMessage({ text: 'Documento removido do dossiê.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
   };

   const resetExecutionTaskForm = () => {
      setExecutionTaskForm({
         title: '',
         description: '',
         phase: selectedProjectSchedule[0]?.title || '',
         responsible: '',
         dueDate: '',
         priority: 'medium'
      });
   };

   const handleSaveExecutionTask = async () => {
      if (!selectedProject || !user?.id || !executionTaskForm.title.trim()) return;

      setIsSavingExecutionTask(true);
      const matchedSchedule = selectedProjectSchedule.find(event => event.title === executionTaskForm.phase);
      const { error } = await supabase.from('project_execution_tasks').insert([{
         user_id: user.id,
         project_id: selectedProject.id,
         schedule_event_id: matchedSchedule?.id || null,
         title: executionTaskForm.title.trim(),
         description: executionTaskForm.description.trim() || null,
         phase: executionTaskForm.phase || 'Geral',
         responsible: executionTaskForm.responsible.trim() || null,
         due_date: executionTaskForm.dueDate || null,
         priority: executionTaskForm.priority,
         status: 'todo'
      }]);

      if (error) {
         setMessage({ text: 'Erro ao salvar tarefa. Aplique a migration 00009 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
      } else {
         await fetchExecutionTasks(selectedProject.id);
         resetExecutionTaskForm();
         setMessage({ text: 'Tarefa de execução criada com sucesso.', type: 'success' });
         setTimeout(() => setMessage(null), 3500);
      }

      setIsSavingExecutionTask(false);
   };

   const handleUpdateExecutionTaskStatus = async (task: ExecutionTask, status: ExecutionTask['status']) => {
      if (!selectedProject) return;

      const { error } = await supabase
         .from('project_execution_tasks')
         .update({
            status,
            completed_at: status === 'done' ? new Date().toISOString() : null
         })
         .eq('id', task.id);

      if (error) {
         setMessage({ text: 'Erro ao atualizar tarefa: ' + error.message, type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      await fetchExecutionTasks(selectedProject.id);
   };

   const handleCreateDefaultExecutionTasks = async () => {
      if (!selectedProject || !user?.id) return;

      const sourceEvents = selectedProjectSchedule.length ? selectedProjectSchedule : [];
      if (!sourceEvents.length) {
         setMessage({ text: 'Gere o plano de execução primeiro para criar tarefas por etapa.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      const existingTitles = new Set(selectedProjectTasks.map(task => `${task.phase}::${task.title}`.toLowerCase()));
      const taskBlueprints = sourceEvents.flatMap(event => [
         {
            title: `Preparar recursos para ${event.title}`,
            description: 'Confirmar materiais, equipe, acesso ao imóvel e condições para iniciar a etapa.',
            phase: event.title,
            schedule_event_id: event.id,
            due_date: event.startDate,
            priority: 'medium' as ExecutionTask['priority']
         },
         {
            title: `Validar entrega da etapa ${event.title}`,
            description: 'Conferir execução, registrar evidências no diário de obra e liberar próxima frente.',
            phase: event.title,
            schedule_event_id: event.id,
            due_date: event.endDate,
            priority: 'high' as ExecutionTask['priority']
         }
      ]).filter(task => !existingTitles.has(`${task.phase}::${task.title}`.toLowerCase()));

      if (!taskBlueprints.length) {
         setMessage({ text: 'As tarefas padrão desta obra já foram criadas.', type: 'success' });
         setTimeout(() => setMessage(null), 3500);
         return;
      }

      const { error } = await supabase.from('project_execution_tasks').insert(taskBlueprints.map(task => ({
         user_id: user.id,
         project_id: selectedProject.id,
         ...task,
         status: 'todo'
      })));

      if (error) {
         setMessage({ text: 'Erro ao gerar tarefas. Aplique a migration 00009 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
         return;
      }

      await fetchExecutionTasks(selectedProject.id);
      setMessage({ text: 'Checklist de execução criado a partir do cronograma.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
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
            taskIds: Array.isArray(report.task_ids) ? report.task_ids : [],
            completedTaskIds: Array.isArray(report.completed_task_ids) ? report.completed_task_ids : [],
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
         taskIds: [],
         completedTaskIds: [],
         photosText: ''
      });
      dailyPhotoFiles.forEach(photo => URL.revokeObjectURL(photo.url));
      setDailyPhotoFiles([]);
   };

   const handleDailyPhotoSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;

      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      const validFiles = files.filter(file => allowedTypes.includes(file.type) && file.size <= 8 * 1024 * 1024);

      if (validFiles.length !== files.length) {
         setMessage({ text: 'Algumas imagens foram ignoradas. Use PNG, JPG ou WebP com até 8MB.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
      }

      const previews = validFiles.map(file => ({
         id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
         file,
         url: URL.createObjectURL(file)
      }));

      setDailyPhotoFiles(prev => [...prev, ...previews].slice(0, 8));
   };

   const handleSaveDailyReport = async () => {
      if (!selectedProject || !user?.id || !dailyReportForm.activities.trim()) return;

      setIsSavingDailyReport(true);
      const linkedPhotos = dailyReportForm.photosText
         .split('\n')
         .map(item => item.trim())
         .filter(Boolean);
      const uploadedPhotoPaths: string[] = [];

      try {
         for (const preview of dailyPhotoFiles) {
            const filePath = `${user.id}/${selectedProject.id}/${Date.now()}-${sanitizeFileName(preview.file.name)}`;
            const { error: uploadError } = await withTimeout(
               supabase.storage.from('project-daily-photos').upload(filePath, preview.file, {
                  cacheControl: '3600',
                  upsert: false
               }),
               45000,
               'Tempo esgotado ao enviar uma foto. Verifique sua conexão e tente novamente.'
            );

            if (uploadError) {
               throw new Error(uploadError.message || 'Storage recusou o envio da foto.');
            }

            uploadedPhotoPaths.push(filePath);
         }
      } catch (error: any) {
         setIsSavingDailyReport(false);
         setMessage({
            text: `Erro ao enviar fotos: ${error?.message || 'verifique o bucket project-daily-photos no Supabase.'}`,
            type: 'error'
         });
         setTimeout(() => setMessage(null), 7000);
         return;
      }

      const photos = [...linkedPhotos, ...uploadedPhotoPaths];

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
         task_ids: dailyReportForm.taskIds,
         completed_task_ids: dailyReportForm.completedTaskIds,
         shared_with_client: false
      }]);

      if (error) {
         if (uploadedPhotoPaths.length) {
            await supabase.storage.from('project-daily-photos').remove(uploadedPhotoPaths);
         }
         setMessage({ text: 'Erro ao salvar diário. Aplique as migrations 00007 e 00008 no Supabase.', type: 'error' });
         setTimeout(() => setMessage(null), 6500);
      } else {
         if (dailyReportForm.completedTaskIds.length) {
            const { error: taskError } = await supabase
               .from('project_execution_tasks')
               .update({
                  status: 'done',
                  completed_at: new Date().toISOString()
               })
               .in('id', dailyReportForm.completedTaskIds);

            if (taskError) {
               console.warn('Não foi possível concluir tarefas vinculadas ao diário:', taskError.message);
            }
         }
         await fetchDailyReports(selectedProject.id);
         await fetchExecutionTasks(selectedProject.id);
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

   const isExternalPhotoUrl = (photo: string) => /^https?:\/\//i.test(photo);

   const getDailyPhotoDisplayUrl = (photo: string) => isExternalPhotoUrl(photo) ? photo : dailyPhotoUrls[photo];

   const getDailyPhotoUrl = async (photo: string) => {
      if (isExternalPhotoUrl(photo)) return photo;

      const { data, error } = await supabase.storage
         .from('project-daily-photos')
         .createSignedUrl(photo, 60 * 60 * 24 * 7);

      if (error || !data?.signedUrl) {
         throw new Error(error?.message || 'Não foi possível gerar link temporário da foto.');
      }

      return data.signedUrl;
   };

   const handleOpenDailyPhoto = async (photo: string) => {
      try {
         const url = await getDailyPhotoUrl(photo);
         window.open(url, '_blank');
      } catch (error: any) {
         setMessage({ text: 'Erro ao abrir foto: ' + (error?.message || 'link indisponível'), type: 'error' });
         setTimeout(() => setMessage(null), 4500);
      }
   };

   const getClientReportPhotoLinks = async () => {
      const photos = clientReportWindowReports.flatMap(report => report.photos);
      const links: string[] = [];

      for (const photo of photos) {
         try {
            links.push(await getDailyPhotoUrl(photo));
         } catch (error) {
            console.warn('Foto ignorada no relatório do cliente:', photo);
         }
      }

      return links;
   };

   const getPrintableReportPhotos = async () => {
      const photoItems: { url: string; date: string; label: string }[] = [];

      for (const report of clientReportWindowReports) {
         for (const [index, photo] of report.photos.entries()) {
            try {
               photoItems.push({
                  url: await getDailyPhotoUrl(photo),
                  date: report.reportDate,
                  label: `Foto ${index + 1} - ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}`
               });
            } catch (error) {
               console.warn('Foto ignorada na impressão:', photo);
            }
         }
      }

      return photoItems;
   };

   const buildClientProgressReport = (photoLinks: string[] = []) => {
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
      const taskLines = reports
         .filter(report => report.taskIds.length)
         .map(report => {
            const workedTasks = report.taskIds
               .map(taskId => {
                  const task = getTaskById(taskId);
                  if (!task) return null;
                  return `${task.title}${report.completedTaskIds.includes(taskId) ? ' (concluída)' : ''}`;
               })
               .filter(Boolean)
               .join('; ');
            return workedTasks
               ? `- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${workedTasks}`
               : '';
         })
         .filter(Boolean)
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
         'Tarefas vinculadas:',
         taskLines || 'Nenhuma tarefa vinculada aos diários do período.',
         '',
         photosCount ? `Registros fotográficos anexados/linkados: ${photosCount}` : '',
         photoLinks.length ? `Links temporários das fotos:\n${photoLinks.map((link, index) => `${index + 1}. ${link}`).join('\n')}` : ''
      ].filter(line => line !== '').join('\n');
   };

   const handleCopyClientProgressReport = async () => {
      const photoLinks = await getClientReportPhotoLinks();
      const reportText = buildClientProgressReport(photoLinks);
      if (!reportText) return;

      navigator.clipboard.writeText(reportText);
      markClientReportAsShared();
      setMessage({ text: 'Relatório de andamento copiado para enviar ao cliente.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
   };

   const handleSendClientProgressWhatsapp = async () => {
      const photoLinks = await getClientReportPhotoLinks();
      const reportText = buildClientProgressReport(photoLinks);
      if (!reportText || !selectedProject) return;

      window.open(createWhatsappLink('11999999999', reportText), '_blank');
      markClientReportAsShared();
   };

   const markClientReportAsShared = async () => {
      if (!selectedProject || !clientReportWindowReports.length) return;

      const reportIds = clientReportWindowReports.map(report => report.id);
      setDailyReports(prev => prev.map(report => reportIds.includes(report.id) ? { ...report, sharedWithClient: true } : report));

      const { error } = await supabase
         .from('project_daily_reports')
         .update({ shared_with_client: true })
         .in('id', reportIds);

      if (error) {
         console.warn('Não foi possível marcar relatório como compartilhado:', error.message);
      }
   };

   const handlePrintClientProgressReport = async () => {
      if (!selectedProject) return;

      const printWindow = window.open('', '_blank', 'width=900,height=720');
      if (!printWindow) {
         setMessage({ text: 'Não foi possível abrir a prévia. Verifique o bloqueador de pop-up.', type: 'error' });
         setTimeout(() => setMessage(null), 4500);
         return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Preparando relatório...</title>
            <style>
              body { align-items: center; background: #020617; color: #5eead4; display: flex; font-family: Arial, sans-serif; font-weight: 800; gap: 12px; height: 100vh; justify-content: center; margin: 0; }
              span { border: 3px solid rgba(94, 234, 212, .25); border-top-color: #5eead4; border-radius: 999px; height: 28px; width: 28px; animation: spin .8s linear infinite; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body><span></span>Preparando relatório com fotos...</body>
        </html>
      `);
      printWindow.document.close();

      const escapeHtml = (value: string) => value
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;');
      const reports = clientReportWindowReports;
      const photos = await getPrintableReportPhotos();
      const latestReportDate = reports[0]?.reportDate
         ? new Date(`${reports[0].reportDate}T00:00:00`).toLocaleDateString()
         : 'sem registros no período';
      const blockers = reports.filter(report => report.blockers);
      const nextSteps = reports.filter(report => report.nextSteps);
      const reportCards = reports.map(report => `
        <article class="entry">
          <div class="entry-meta">
            <span>${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}</span>
            <span>${escapeHtml(report.status.replace('_', ' '))}</span>
            <span>${escapeHtml(report.weather.replace('_', ' '))}</span>
          </div>
          ${report.taskIds.length ? `<div class="tasks"><p class="eyebrow">Tarefas trabalhadas</p>${report.taskIds.map(taskId => {
            const task = getTaskById(taskId);
            if (!task) return '';
            return `<p>${escapeHtml(task.title)}${report.completedTaskIds.includes(taskId) ? ' <strong>(concluída)</strong>' : ''}</p>`;
         }).join('')}</div>` : ''}
          ${report.workforce ? `<p class="eyebrow">Equipe / responsáveis</p><p>${escapeHtml(report.workforce)}</p>` : ''}
          <p class="eyebrow">Atividades realizadas</p>
          <p>${escapeHtml(report.activities)}</p>
          ${report.blockers ? `<div class="alert"><p class="eyebrow">Pendências / bloqueios</p><p>${escapeHtml(report.blockers)}</p></div>` : ''}
          ${report.nextSteps ? `<div class="next"><p class="eyebrow">Próximos passos</p><p>${escapeHtml(report.nextSteps)}</p></div>` : ''}
        </article>
      `).join('');
      const photoGrid = photos.map(photo => `
        <figure>
          <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.label)}" />
          <figcaption>${escapeHtml(photo.label)}</figcaption>
        </figure>
      `).join('');

      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>Relatório - ${escapeHtml(selectedProject.name)}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #f8fafc; line-height: 1.5; }
              main { max-width: 960px; margin: 0 auto; background: #fff; min-height: 100vh; }
              .hero { background: #0f766e; color: #fff; padding: 44px 48px; }
              .brand { font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; opacity: .85; }
              h1 { font-size: 34px; margin: 10px 0 8px; line-height: 1.1; }
              h2 { font-size: 18px; margin: 0 0 18px; }
              p { margin: 0 0 10px; white-space: pre-wrap; }
              .muted { color: #64748b; font-weight: 700; }
              .section { padding: 32px 48px; border-bottom: 1px solid #e5e7eb; }
              .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
              .metric { border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; background: #f8fafc; }
              .metric span { display: block; color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
              .metric strong { display: block; margin-top: 8px; font-size: 22px; }
              .entry { border: 1px solid #e5e7eb; border-radius: 22px; padding: 20px; margin-bottom: 16px; break-inside: avoid; }
              .entry-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
              .entry-meta span { border-radius: 999px; background: #ccfbf1; color: #0f766e; padding: 6px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
              .eyebrow { color: #0f766e; font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; margin-top: 12px; }
              .alert, .next { border-radius: 18px; padding: 14px; margin-top: 14px; }
              .alert { background: #fff1f2; color: #9f1239; }
              .next { background: #ecfdf5; color: #047857; }
              .tasks { border-radius: 18px; padding: 14px; margin-bottom: 14px; background: #f0fdfa; color: #0f766e; }
              .tasks p:not(.eyebrow) { margin-bottom: 6px; }
              .gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
              figure { margin: 0; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; break-inside: avoid; background: #f8fafc; }
              img { display: block; width: 100%; height: 260px; object-fit: cover; }
              figcaption { padding: 10px 12px; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
              @media print {
                body { background: #fff; }
                main { max-width: none; }
                .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                .section { padding: 24px 32px; }
                img { height: 220px; }
              }
            </style>
          </head>
          <body>
            <main>
              <header class="hero">
                <div class="brand">PrecificaPro</div>
                <h1>Relatório de Andamento</h1>
                <p>${escapeHtml(selectedProject.name)}</p>
                <p>Cliente: ${escapeHtml(selectedProject.clientName)}</p>
              </header>
              <section class="section">
                <div class="summary">
                  <div class="metric"><span>Período</span><strong>${escapeHtml(clientReportPeriodLabel)}</strong></div>
                  <div class="metric"><span>Última atualização</span><strong>${escapeHtml(latestReportDate)}</strong></div>
                  <div class="metric"><span>Avanço físico</span><strong>${scheduleProgress}%</strong></div>
                  <div class="metric"><span>Registros</span><strong>${reports.length}</strong></div>
                </div>
                ${nextScheduleEvent ? `<p class="muted" style="margin-top:18px;">Próximo marco: ${escapeHtml(nextScheduleEvent.title)}</p>` : ''}
              </section>
              <section class="section">
                <h2>Resumo por data</h2>
                ${reportCards || '<p class="muted">Ainda não há registros no período selecionado.</p>'}
              </section>
              <section class="section">
                <h2>Pendências e próximos passos</h2>
                <p class="eyebrow">Pontos de atenção</p>
                ${blockers.length ? blockers.map(report => `<p>- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${escapeHtml(report.blockers || '')}</p>`).join('') : '<p>Nenhuma pendência relevante registrada no período.</p>'}
                <p class="eyebrow">Próximos passos</p>
                ${nextSteps.length ? nextSteps.map(report => `<p>- ${new Date(`${report.reportDate}T00:00:00`).toLocaleDateString()}: ${escapeHtml(report.nextSteps || '')}</p>`).join('') : '<p>Os próximos passos serão atualizados no próximo acompanhamento.</p>'}
              </section>
              ${photos.length ? `<section class="section"><h2>Registro fotográfico</h2><div class="gallery">${photoGrid}</div></section>` : ''}
            </main>
            <script>
              window.onload = () => {
                const images = Array.from(document.images);
                if (!images.length) {
                  window.print();
                  return;
                }
                Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
                  img.onload = resolve;
                  img.onerror = resolve;
                }))).then(() => window.print());
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      markClientReportAsShared();
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
                              onClick={() => handleSendProjectResponsibleWhatsapp(`Olá ${selectedProject.responsibleName || 'responsável'}, segue atualização sobre a obra *${selectedProject.name}*.`)}
                              className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="Avisar responsável por WhatsApp"
                           >
                              <MessageCircle size={14} />
                           </button>
                        </div>
                     </div>
                  </div>
                  <div className="mb-6 grid gap-3 rounded-[32px] border border-teal-100 bg-teal-50 p-4 dark:border-teal-900/40 dark:bg-teal-950/20 md:grid-cols-[1fr_1fr_auto_auto]">
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Responsável da obra</label>
                        <input
                           value={responsibleForm.name}
                           onChange={(e) => setResponsibleForm({ ...responsibleForm, name: e.target.value })}
                           placeholder="Nome do responsável"
                           className="mt-2 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">WhatsApp</label>
                        <input
                           value={responsibleForm.phone}
                           onChange={(e) => setResponsibleForm({ ...responsibleForm, phone: e.target.value })}
                           placeholder="(00) 00000-0000"
                           className="mt-2 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm font-bold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                        />
                     </div>
                     <button
                        onClick={handleSaveProjectResponsible}
                        className="self-end rounded-2xl bg-teal-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700"
                     >
                        Salvar
                     </button>
                     <button
                        onClick={() => handleSendProjectResponsibleWhatsapp(`Olá ${responsibleForm.name || 'responsável'}, este é um aviso sobre a obra *${selectedProject.name}*.`)}
                        className="inline-flex items-center justify-center gap-2 self-end rounded-2xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                     >
                        <MessageCircle size={15} />
                        Avisar
                     </button>
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
                           onClick={() => setActiveTab('tasks')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'tasks' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Tarefas
                           {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('diary')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'diary' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Diário de Obra
                           {activeTab === 'diary' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('documents')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'documents' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Documentos
                           {activeTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
                        </button>
                        <button
                           onClick={() => setActiveTab('communication')}
                           className={`pb-4 px-4 text-sm font-bold transition-all relative ${activeTab === 'communication' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                           Comunicação
                           {activeTab === 'communication' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full" />}
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
                                    <CheckCircle2 size={22} className="text-emerald-600" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tarefas</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{taskProgress}%</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">{taskCompleted} de {selectedProjectTasks.length} tarefas concluídas</p>
                                 </div>
                                 <div className="rounded-3xl bg-white p-5 dark:bg-gray-900">
                                    <ClipboardCheck size={22} className="text-rose-500" />
                                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Pendências</p>
                                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{taskBlocked + overdueTasks.length}</p>
                                    <p className="mt-1 text-xs font-bold text-gray-500">Bloqueadas ou vencidas</p>
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

                     {activeTab === 'tasks' && (
                        <div className="grid gap-6 lg:grid-cols-[420px_1fr] animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Checklist operacional</p>
                              <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Nova tarefa de execução</h3>
                              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Transforme cada etapa da obra em ações com responsável, prazo e prioridade.</p>

                              <div className="mt-6 space-y-4">
                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Título da tarefa</label>
                                    <input
                                       value={executionTaskForm.title}
                                       onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, title: e.target.value })}
                                       placeholder="Ex: Conferir pontos hidráulicos antes do fechamento"
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Etapa</label>
                                       <select
                                          value={executionTaskForm.phase}
                                          onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, phase: e.target.value })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       >
                                          <option value="">Geral</option>
                                          {selectedProjectSchedule.map(event => (
                                             <option key={event.id} value={event.title}>{event.title}</option>
                                          ))}
                                       </select>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prioridade</label>
                                       <select
                                          value={executionTaskForm.priority}
                                          onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, priority: e.target.value as ExecutionTask['priority'] })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       >
                                          <option value="low">Baixa</option>
                                          <option value="medium">Média</option>
                                          <option value="high">Alta</option>
                                       </select>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Responsável</label>
                                       <input
                                          value={executionTaskForm.responsible}
                                          onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, responsible: e.target.value })}
                                          placeholder="Ex: João / equipe elétrica"
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prazo</label>
                                       <input
                                          type="date"
                                          value={executionTaskForm.dueDate}
                                          onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, dueDate: e.target.value })}
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descrição / critério de aceite</label>
                                    <textarea
                                       value={executionTaskForm.description}
                                       onChange={(e) => setExecutionTaskForm({ ...executionTaskForm, description: e.target.value })}
                                       placeholder="Descreva como saberemos que esta tarefa está concluída..."
                                       className="mt-2 h-28 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <button
                                    onClick={handleSaveExecutionTask}
                                    disabled={isSavingExecutionTask || !executionTaskForm.title.trim()}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:opacity-50"
                                 >
                                    <Plus size={16} />
                                    {isSavingExecutionTask ? 'Salvando...' : 'Adicionar tarefa'}
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-6">
                              <div className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                                 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Execução da obra</p>
                                       <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Tarefas por etapa</h3>
                                       <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">{taskCompleted} de {selectedProjectTasks.length} tarefas concluídas. {taskBlocked ? `${taskBlocked} bloqueada(s).` : 'Sem bloqueios registrados.'}</p>
                                    </div>
                                    <button
                                       onClick={handleCreateDefaultExecutionTasks}
                                       className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950"
                                    >
                                       <ClipboardCheck size={16} />
                                       Gerar checklist
                                    </button>
                                 </div>
                                 <div className="mt-5 h-3 overflow-hidden rounded-full bg-white dark:bg-gray-950">
                                    <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${taskProgress}%` }} />
                                 </div>
                              </div>

                              <div className="space-y-3">
                                 {selectedProjectTasks.length ? (
                                    selectedProjectTasks.map(task => {
                                       const isOverdue = task.status !== 'done' && task.dueDate && task.dueDate < new Date().toISOString().split('T')[0];
                                       const statusLabel = task.status === 'todo'
                                          ? 'A fazer'
                                          : task.status === 'in_progress'
                                             ? 'Em execução'
                                             : task.status === 'done'
                                                ? 'Concluída'
                                                : 'Bloqueada';
                                       return (
                                          <div key={task.id} className={`rounded-3xl border p-5 transition ${
                                             task.status === 'done'
                                                ? 'border-emerald-100 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                                : task.status === 'blocked' || isOverdue
                                                   ? 'border-rose-100 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20'
                                                   : 'border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900'
                                          }`}>
                                             <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                   <div className="flex flex-wrap gap-2">
                                                      <span className="rounded-full bg-teal-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{task.phase || 'Geral'}</span>
                                                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-800">{statusLabel}</span>
                                                      <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                                         task.priority === 'high'
                                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                            : task.priority === 'medium'
                                                               ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                               : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                                                      }`}>{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}</span>
                                                      {isOverdue && <span className="rounded-full bg-rose-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white">Vencida</span>}
                                                   </div>
                                                   <h4 className="mt-3 font-black text-gray-900 dark:text-white">{task.title}</h4>
                                                   {task.description && <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{task.description}</p>}
                                                   <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                      {task.responsible ? `Responsável: ${task.responsible}` : 'Responsável não definido'}
                                                      {task.dueDate ? ` · Prazo: ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}` : ''}
                                                   </p>
                                                </div>
                                                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                                                   {task.status !== 'done' && (
                                                      <button
                                                         onClick={() => handleUpdateExecutionTaskStatus(task, 'done')}
                                                         className="rounded-xl bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700"
                                                      >
                                                         Concluir
                                                      </button>
                                                   )}
                                                   {task.status !== 'in_progress' && task.status !== 'done' && (
                                                      <button
                                                         onClick={() => handleUpdateExecutionTaskStatus(task, 'in_progress')}
                                                         className="rounded-xl bg-teal-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-teal-700 transition hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-300"
                                                      >
                                                         Iniciar
                                                      </button>
                                                   )}
                                                   {task.status !== 'blocked' && task.status !== 'done' && (
                                                      <button
                                                         onClick={() => handleUpdateExecutionTaskStatus(task, 'blocked')}
                                                         className="rounded-xl bg-rose-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300"
                                                      >
                                                         Bloquear
                                                      </button>
                                                   )}
                                                   {task.status === 'done' && (
                                                      <button
                                                         onClick={() => handleUpdateExecutionTaskStatus(task, 'todo')}
                                                         className="rounded-xl bg-gray-100 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-600 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                                      >
                                                         Reabrir
                                                      </button>
                                                   )}
                                                </div>
                                             </div>
                                          </div>
                                       );
                                    })
                                 ) : (
                                    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                                       <ClipboardCheck size={34} className="mx-auto text-gray-300" />
                                       <p className="mt-4 font-black text-gray-900 dark:text-white">Nenhuma tarefa criada</p>
                                       <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Crie tarefas manualmente ou gere o checklist a partir do plano de execução.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
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

                                 <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
                                    <div className="flex items-start justify-between gap-3">
                                       <div>
                                          <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Tarefas trabalhadas</label>
                                          <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">Vincule o diário às tarefas executadas hoje.</p>
                                       </div>
                                       <button
                                          type="button"
                                          onClick={() => setActiveTab('tasks')}
                                          className="shrink-0 rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-widest text-teal-700 dark:bg-gray-950 dark:text-teal-300"
                                       >
                                          Ver tarefas
                                       </button>
                                    </div>
                                    <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                                       {openExecutionTasks.length ? (
                                          openExecutionTasks.map(task => {
                                             const selected = dailyReportForm.taskIds.includes(task.id);
                                             const completed = dailyReportForm.completedTaskIds.includes(task.id);
                                             return (
                                                <div key={task.id} className={`rounded-2xl border p-3 ${selected ? 'border-teal-300 bg-white dark:border-teal-800 dark:bg-gray-900' : 'border-transparent bg-white/60 dark:bg-gray-950/60'}`}>
                                                   <label className="flex cursor-pointer items-start gap-3">
                                                      <input
                                                         type="checkbox"
                                                         checked={selected}
                                                         onChange={() => toggleDailyReportTask(task.id)}
                                                         className="mt-1 h-4 w-4 accent-teal-600"
                                                      />
                                                      <span className="min-w-0 flex-1">
                                                         <span className="block text-sm font-black text-gray-900 dark:text-white">{task.title}</span>
                                                         <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-gray-400">{task.phase || 'Geral'}{task.responsible ? ` · ${task.responsible}` : ''}</span>
                                                      </span>
                                                   </label>
                                                   {selected && (
                                                      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                                         <input
                                                            type="checkbox"
                                                            checked={completed}
                                                            onChange={() => toggleDailyReportCompletedTask(task.id)}
                                                            className="h-4 w-4 accent-emerald-600"
                                                         />
                                                         Marcar como concluída neste diário
                                                      </label>
                                                   )}
                                                </div>
                                             );
                                          })
                                       ) : (
                                          <div className="rounded-2xl border border-dashed border-teal-200 bg-white p-4 text-center dark:border-teal-900 dark:bg-gray-950">
                                             <p className="text-sm font-black text-gray-900 dark:text-white">Nenhuma tarefa aberta</p>
                                             <p className="mt-1 text-xs font-bold text-gray-500">Crie ou gere tarefas na aba Tarefas para vinculá-las ao diário.</p>
                                          </div>
                                       )}
                                    </div>
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
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fotos da obra</label>
                                    <label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-5 text-center transition hover:border-teal-500 hover:bg-teal-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-teal-700 dark:hover:bg-teal-900/20">
                                       <Camera size={24} className="text-teal-600" />
                                       <span className="mt-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Anexar fotos</span>
                                       <span className="mt-1 text-[11px] font-bold text-gray-400">PNG, JPG ou WebP até 8MB cada</span>
                                       <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleDailyPhotoSelection} />
                                    </label>
                                    {dailyPhotoFiles.length > 0 && (
                                       <div className="mt-3 grid grid-cols-2 gap-3">
                                          {dailyPhotoFiles.map((photo, index) => (
                                             <div key={photo.id} className="group relative overflow-hidden rounded-2xl border border-teal-100 bg-gray-950 dark:border-teal-900">
                                                <img src={photo.url} alt={photo.file.name} className="h-28 w-full object-cover opacity-90 transition group-hover:scale-105" />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                                                   <p className="truncate text-[9px] font-black uppercase tracking-widest text-white">{photo.file.name}</p>
                                                </div>
                                                <button
                                                   type="button"
                                                   onClick={() => {
                                                      URL.revokeObjectURL(photo.url);
                                                      setDailyPhotoFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
                                                   }}
                                                   className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white transition hover:bg-rose-600"
                                                >
                                                   <X size={14} />
                                                </button>
                                             </div>
                                          ))}
                                       </div>
                                    )}
                                    <textarea
                                       value={dailyReportForm.photosText}
                                       onChange={(e) => setDailyReportForm({ ...dailyReportForm, photosText: e.target.value })}
                                       placeholder="Opcional: cole links externos, um por linha."
                                       className="mt-3 h-16 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
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
                                          onClick={handlePrintClientProgressReport}
                                          disabled={!selectedProjectReports.length}
                                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-950 dark:text-teal-300 dark:hover:bg-gray-900"
                                       >
                                          <Printer size={15} />
                                          Imprimir
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
                                    {clientReportWindowReports.length} registro(s) considerados em {clientReportPeriodLabel}. {clientReportWindowReports.filter(report => report.sharedWithClient).length} já marcado(s) como compartilhado(s).
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
                                                   {report.sharedWithClient && (
                                                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                         Compartilhado
                                                      </span>
                                                   )}
                                                </div>
                                                {report.workforce && <p className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400">Equipe: {report.workforce}</p>}
                                                {report.taskIds.length > 0 && (
                                                   <div className="mt-4 rounded-2xl bg-teal-50 p-4 text-teal-800 dark:bg-teal-900/20 dark:text-teal-200">
                                                      <p className="text-[10px] font-black uppercase tracking-widest">Tarefas vinculadas</p>
                                                      <div className="mt-2 space-y-2">
                                                         {report.taskIds.map(taskId => {
                                                            const task = getTaskById(taskId);
                                                            if (!task) return null;
                                                            const completedInReport = report.completedTaskIds.includes(taskId);
                                                            return (
                                                               <div key={`${report.id}-${taskId}`} className="flex items-start gap-2 text-sm font-bold">
                                                                  {completedInReport ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <ClipboardCheck size={16} className="mt-0.5 shrink-0 text-teal-600" />}
                                                                  <span>{task.title} <span className="text-xs uppercase tracking-widest opacity-70">{completedInReport ? 'concluída no diário' : 'trabalhada'}</span></span>
                                                               </div>
                                                            );
                                                         })}
                                                      </div>
                                                   </div>
                                                )}
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
                                                   <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                      {report.photos.map((photo, index) => {
                                                         const photoUrl = getDailyPhotoDisplayUrl(photo);
                                                         return (
                                                         <button key={`${report.id}-${photo}`} onClick={() => handleOpenDailyPhoto(photo)} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-100 text-left transition hover:border-teal-300 dark:border-gray-800 dark:bg-gray-950">
                                                            {photoUrl ? (
                                                               <img src={photoUrl} alt={`Foto ${index + 1}`} className="h-28 w-full object-cover transition group-hover:scale-105" />
                                                            ) : (
                                                               <div className="flex h-28 w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-gray-800">
                                                                  <Camera size={22} />
                                                               </div>
                                                            )}
                                                            <div className="p-2">
                                                               <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Foto {index + 1}</p>
                                                            </div>
                                                         </button>
                                                         );
                                                      })}
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

                     {activeTab === 'documents' && (
                        <div className="grid gap-6 lg:grid-cols-[420px_1fr] animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Dossiê da obra</p>
                              <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Novo documento</h3>
                              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Guarde contratos, ART/RRT, alvarás, projetos, notas, garantias e entrega final em um só lugar.</p>

                              <div className="mt-6 space-y-4">
                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Categoria</label>
                                    <select
                                       value={documentForm.category}
                                       onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value as ProjectDocumentCategory })}
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    >
                                       {PROJECT_DOCUMENT_CATEGORIES.map(category => (
                                          <option key={category.value} value={category.value}>{category.label}</option>
                                       ))}
                                    </select>
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome do documento</label>
                                    <input
                                       value={documentForm.name}
                                       onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                                       placeholder="Ex: ART da reforma, contrato assinado..."
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descrição</label>
                                    <textarea
                                       value={documentForm.description}
                                       onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                                       placeholder="Observações internas, número do documento, fornecedor ou contexto..."
                                       className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Validade</label>
                                    <input
                                       type="date"
                                       value={documentForm.validUntil}
                                       onChange={(e) => setDocumentForm({ ...documentForm, validUntil: e.target.value })}
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>

                                 <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-4 py-5 text-center transition hover:border-teal-500 hover:bg-teal-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-teal-700 dark:hover:bg-teal-900/20">
                                    <FileText size={26} className="text-teal-600" />
                                    <span className="mt-2 text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">{documentFile ? documentFile.name : 'Anexar arquivo'}</span>
                                    <span className="mt-1 text-[11px] font-bold text-gray-400">PDF, imagens, Word ou Excel até 20MB</span>
                                    <input
                                       type="file"
                                       accept="application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                       className="hidden"
                                       onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                                    />
                                 </label>

                                 <button
                                    onClick={handleSaveProjectDocument}
                                    disabled={!documentFile || isSavingDocument}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                 >
                                    {isSavingDocument ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {isSavingDocument ? 'Enviando...' : 'Salvar no dossiê'}
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-6">
                              <div className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                                 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Arquivo técnico</p>
                                       <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Documentos da obra</h3>
                                       <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                          {selectedProjectDocuments.length} documento(s). {expiredDocuments ? `${expiredDocuments} vencido(s).` : expiringDocuments ? `${expiringDocuments} próximo(s) do vencimento.` : 'Sem vencimentos críticos.'}
                                       </p>
                                    </div>
                                    <div className="rounded-3xl bg-white px-6 py-4 text-center dark:bg-gray-950">
                                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dossiê</p>
                                       <p className="mt-1 text-3xl font-black text-teal-600">{selectedProjectDocuments.length}</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                 {documentsByCategory.filter(category => category.count > 0).map(category => (
                                    <div key={category.value} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{category.label}</p>
                                       <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{category.count}</p>
                                    </div>
                                 ))}
                              </div>

                              <div className="space-y-3">
                                 {selectedProjectDocuments.length ? (
                                    selectedProjectDocuments.map(document => {
                                       const validityLabel = document.validityStatus === 'valido'
                                          ? 'Válido'
                                          : document.validityStatus === 'proximo_vencimento'
                                             ? 'Vence em breve'
                                             : 'Vencido';
                                       return (
                                          <article key={document.id} className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                                             <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div className="flex gap-4">
                                                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300">
                                                      <FileText size={22} />
                                                   </div>
                                                   <div>
                                                      <div className="flex flex-wrap gap-2">
                                                         <span className="rounded-full bg-teal-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">{getDocumentCategoryLabel(document.category)}</span>
                                                         <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                                                            document.validityStatus === 'vencido'
                                                               ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                               : document.validityStatus === 'proximo_vencimento'
                                                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                         }`}>{validityLabel}</span>
                                                      </div>
                                                      <h4 className="mt-3 font-black text-gray-900 dark:text-white">{document.name}</h4>
                                                      {document.description && <p className="mt-2 text-sm font-semibold leading-6 text-gray-500 dark:text-gray-400">{document.description}</p>}
                                                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                         {formatFileSize(document.fileSize)} · Enviado em {new Date(document.uploadedAt).toLocaleDateString()}
                                                         {document.validUntil ? ` · Validade: ${new Date(`${document.validUntil}T00:00:00`).toLocaleDateString()}` : ''}
                                                      </p>
                                                   </div>
                                                </div>
                                                <div className="flex shrink-0 gap-2">
                                                   <button
                                                      onClick={() => handleOpenProjectDocument(document)}
                                                      className="rounded-xl bg-gray-950 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950"
                                                   >
                                                      Abrir
                                                   </button>
                                                   <button
                                                      onClick={() => handleDeleteProjectDocument(document)}
                                                      className="rounded-xl bg-rose-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300"
                                                   >
                                                      Remover
                                                   </button>
                                                </div>
                                             </div>
                                          </article>
                                       );
                                    })
                                 ) : (
                                    <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
                                       <FileText size={34} className="mx-auto text-gray-300" />
                                       <p className="mt-4 font-black text-gray-900 dark:text-white">Nenhum documento anexado</p>
                                       <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Comece anexando contrato, ART/RRT, alvará ou projeto executivo.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     )}

                     {activeTab === 'communication' && (
                        <div className="grid gap-6 lg:grid-cols-[420px_1fr] animate-in fade-in duration-300">
                           <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-950">
                              <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Equipe da obra</p>
                              <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Novo contato</h3>
                              <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Cadastre prestadores, fornecedores e responsáveis para avisos rápidos por WhatsApp.</p>

                              <div className="mt-6 space-y-4">
                                 <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Prestador cadastrado</label>
                                    <select
                                       value={selectedPrestadorId}
                                       onChange={(e) => setSelectedPrestadorId(e.target.value)}
                                       className="mt-2 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                                    >
                                       <option value="">Selecionar prestador do cadastro</option>
                                       {availablePrestadoresForProject.map(prestador => (
                                          <option key={prestador.id} value={prestador.id}>
                                             {prestador.nome} - {prestador.ramoAtividade || prestador.categoriaProfissional}
                                          </option>
                                       ))}
                                    </select>
                                    <button
                                       onClick={handleLinkPrestadorToProject}
                                       disabled={isLinkingPrestador || !selectedPrestadorId}
                                       className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:opacity-50"
                                    >
                                       {isLinkingPrestador ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                                       {isLinkingPrestador ? 'Vinculando...' : 'Vincular prestador'}
                                    </button>
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-teal-700/70 dark:text-teal-300/70">
                                       Ou preencha um contato avulso abaixo
                                    </p>
                                 </div>

                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome</label>
                                    <input
                                       value={teamMemberForm.name}
                                       onChange={(e) => setTeamMemberForm({ ...teamMemberForm, name: e.target.value })}
                                       placeholder="Ex: João Eletricista"
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Função</label>
                                       <input
                                          value={teamMemberForm.role}
                                          onChange={(e) => setTeamMemberForm({ ...teamMemberForm, role: e.target.value })}
                                          placeholder="Ex: elétrica"
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">WhatsApp</label>
                                       <input
                                          value={teamMemberForm.phone}
                                          onChange={(e) => setTeamMemberForm({ ...teamMemberForm, phone: e.target.value })}
                                          placeholder="(00) 00000-0000"
                                          className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                       />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">E-mail</label>
                                    <input
                                       value={teamMemberForm.email}
                                       onChange={(e) => setTeamMemberForm({ ...teamMemberForm, email: e.target.value })}
                                       placeholder="contato@email.com"
                                       className="mt-2 w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Observações</label>
                                    <textarea
                                       value={teamMemberForm.notes}
                                       onChange={(e) => setTeamMemberForm({ ...teamMemberForm, notes: e.target.value })}
                                       placeholder="Disponibilidade, escopo contratado ou observações importantes..."
                                       className="mt-2 h-20 w-full resize-none rounded-2xl border border-gray-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                                    />
                                 </div>
                                 <button
                                    onClick={handleSaveTeamMember}
                                    disabled={isSavingTeamMember || !teamMemberForm.name.trim()}
                                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-teal-700 disabled:opacity-50"
                                 >
                                    {isSavingTeamMember ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {isSavingTeamMember ? 'Salvando...' : 'Adicionar contato'}
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-6">
                              <div className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Central de comunicação</p>
                                 <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Enviar aviso por WhatsApp</h3>
                                 <div className="mt-5 grid gap-3 md:grid-cols-2">
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Destinatário</label>
                                       <select
                                          value={messageForm.memberId}
                                          onChange={(e) => setMessageForm({ ...messageForm, memberId: e.target.value })}
                                          className="mt-2 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                                       >
                                          <option value="">Selecionar contato</option>
                                          {selectedProjectTeam.filter(member => member.phone).map(member => (
                                             <option key={member.id} value={member.id}>{member.name} - {member.role}</option>
                                          ))}
                                       </select>
                                    </div>
                                    <div>
                                       <label className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Modelo</label>
                                       <select
                                          value={messageForm.template}
                                          onChange={(e) => handleMessageTemplateChange(e.target.value)}
                                          className="mt-2 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 font-bold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                                       >
                                          {MESSAGE_TEMPLATES.map(template => (
                                             <option key={template.value} value={template.value}>{template.label}</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>
                                 <textarea
                                    value={messageForm.message}
                                    onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                                    className="mt-4 h-28 w-full resize-none rounded-2xl border border-teal-100 bg-white px-4 py-3 font-semibold text-gray-900 outline-none dark:border-teal-900 dark:bg-gray-950 dark:text-white"
                                 />
                                 <button
                                    onClick={handleSendProjectMessage}
                                    disabled={isSendingProjectMessage || !messageForm.memberId || !messageForm.message.trim()}
                                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                 >
                                    {isSendingProjectMessage ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                                    {isSendingProjectMessage ? 'Registrando...' : 'Enviar WhatsApp'}
                                 </button>
                              </div>

                              <div className="grid gap-6 lg:grid-cols-2">
                                 <div className="rounded-[32px] border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                                    <div className="flex items-center justify-between">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Envolvidos</p>
                                          <h4 className="mt-1 text-lg font-black text-gray-900 dark:text-white">{selectedProjectTeam.length} contato(s)</h4>
                                       </div>
                                    </div>
                                    <div className="mt-5 space-y-3">
                                       {selectedProjectTeam.length ? selectedProjectTeam.map(member => (
                                          <div key={member.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                                             <div className="flex items-start justify-between gap-3">
                                                <div>
                                                   <div className="flex flex-wrap items-center gap-2">
                                                      <p className="font-black text-gray-900 dark:text-white">{member.name}</p>
                                                      {member.prestadorId && (
                                                         <span className="rounded-full bg-teal-100 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                                            Cadastro
                                                         </span>
                                                      )}
                                                   </div>
                                                   <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-teal-600">{member.role}</p>
                                                   <p className="mt-1 text-xs font-bold text-gray-500">{member.phone || 'Sem WhatsApp'}{member.email ? ` · ${member.email}` : ''}</p>
                                                </div>
                                                <button onClick={() => handleRemoveTeamMember(member)} className="rounded-xl bg-rose-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">Remover</button>
                                             </div>
                                             {member.notes && <p className="mt-3 text-sm font-semibold text-gray-500 dark:text-gray-400">{member.notes}</p>}
                                          </div>
                                       )) : (
                                          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-800">
                                             <p className="text-sm font-black text-gray-900 dark:text-white">Nenhum contato vinculado</p>
                                             <p className="mt-1 text-xs font-bold text-gray-500">Adicione prestadores e responsáveis da obra.</p>
                                          </div>
                                       )}
                                    </div>
                                 </div>

                                 <div className="rounded-[32px] border border-gray-100 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Histórico</p>
                                    <h4 className="mt-1 text-lg font-black text-gray-900 dark:text-white">{selectedProjectMessages.length} mensagem(ns)</h4>
                                    <div className="mt-5 space-y-3">
                                       {selectedProjectMessages.length ? selectedProjectMessages.map(message => (
                                          <div key={message.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                                             <div className="flex items-start justify-between gap-3">
                                                <div>
                                                   <p className="font-black text-gray-900 dark:text-white">{message.recipientName}</p>
                                                   <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">WhatsApp · {new Date(message.sentAt).toLocaleString()}</p>
                                                </div>
                                             </div>
                                             <p className="mt-3 whitespace-pre-line text-sm font-semibold text-gray-600 dark:text-gray-300">{message.message}</p>
                                          </div>
                                       )) : (
                                          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center dark:border-gray-800">
                                             <p className="text-sm font-black text-gray-900 dark:text-white">Nenhuma mensagem registrada</p>
                                             <p className="mt-1 text-xs font-bold text-gray-500">Envie o primeiro aviso para gerar histórico.</p>
                                          </div>
                                       )}
                                    </div>
                                 </div>
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
