
import {
  ChevronRight,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileSignature,
  Hammer,
  Link2,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { createWhatsappLink } from '../utils/whatsapp';

interface ProposalItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  category: 'product' | 'service';
}

interface Proposal {
  id: string;
  clientId?: string;
  projectId?: string;
  proposalNumber: string;
  proposalDate: string;
  client: string;
  clientPhone?: string;
  company: string;
  projetoNome: string;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: string;
  itemsCount: number;
  items: ProposalItem[];
  notes?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  validityDays?: number;
  acceptedAt?: string;
  acceptedBy?: string;
  acceptanceMethod?: string;
  acceptanceNotes?: string;
  publicToken?: string;
  events?: ProposalEvent[];
  contracts?: ProposalContractFile[];
}

interface ProposalEvent {
  id: string;
  type: string;
  title: string;
  details?: string;
  actorType: 'user' | 'client' | 'system';
  createdAt: string;
}

interface ProposalContractFile {
  id: string;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSize: number;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  uploadedAt: string;
  notes?: string;
}

interface OfficeProfile {
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  website?: string;
  logo?: string | null;
  address?: any;
}

const proposalTemplates = [
  {
    id: 'reforma_residencial',
    label: 'Reforma residencial',
    description: 'Escopo completo para apartamento ou casa com projeto, detalhamento e apoio técnico.',
    paymentTerms: '30% na aprovação da proposta, 40% na entrega do anteprojeto e 30% na entrega do projeto executivo.',
    deliveryTerms: 'Prazo estimado de 45 a 60 dias após aprovação da proposta, levantamento de medidas e recebimento das referências do cliente.',
    notes: 'Inclui desenvolvimento do conceito, organização do escopo, detalhamentos técnicos e apoio inicial para contratação de fornecedores.',
    items: [
      { description: 'Briefing, levantamento técnico e programa de necessidades', unit: 'etapa', quantity: 1, unitPrice: 3500, category: 'service' },
      { description: 'Anteprojeto de reforma com layout, conceito e diretrizes de materiais', unit: 'etapa', quantity: 1, unitPrice: 7800, category: 'service' },
      { description: 'Projeto executivo com detalhamento de marcenaria, pontos e acabamentos', unit: 'etapa', quantity: 1, unitPrice: 12500, category: 'service' },
      { description: 'Memorial descritivo e apoio para orçamento com fornecedores', unit: 'etapa', quantity: 1, unitPrice: 4200, category: 'service' }
    ]
  },
  {
    id: 'interiores',
    label: 'Projeto de interiores',
    description: 'Ideal para ambientação, mobiliário, iluminação e acabamento sem obra pesada.',
    paymentTerms: '40% na aprovação, 30% na apresentação do conceito e 30% na entrega final.',
    deliveryTerms: 'Prazo estimado de 30 a 45 dias, condicionado à aprovação das etapas pelo cliente.',
    notes: 'Focado em layout, estética, especificação de acabamentos, mobiliário, iluminação decorativa e lista de compras.',
    items: [
      { description: 'Conceito visual, moodboard e estudo de referências', unit: 'etapa', quantity: 1, unitPrice: 2800, category: 'service' },
      { description: 'Layout humanizado e estudo de mobiliário dos ambientes', unit: 'ambiente', quantity: 3, unitPrice: 1800, category: 'service' },
      { description: 'Especificação de acabamentos, iluminação e peças decorativas', unit: 'etapa', quantity: 1, unitPrice: 3600, category: 'service' },
      { description: 'Lista de compras e caderno final de apresentação', unit: 'etapa', quantity: 1, unitPrice: 2400, category: 'service' }
    ]
  },
  {
    id: 'consultoria',
    label: 'Consultoria técnica',
    description: 'Atendimento rápido para orientar decisão, compra, reforma ou viabilidade.',
    paymentTerms: '100% na aprovação da consultoria para bloqueio da agenda.',
    deliveryTerms: 'Consultoria realizada em até 7 dias úteis conforme agenda. Relatório entregue em até 3 dias úteis após a visita/reunião.',
    notes: 'Inclui reunião, análise técnica, recomendações práticas e relatório objetivo com próximos passos.',
    items: [
      { description: 'Reunião de diagnóstico e análise das necessidades', unit: 'hora', quantity: 2, unitPrice: 450, category: 'service' },
      { description: 'Visita técnica ou análise remota documentada', unit: 'visita', quantity: 1, unitPrice: 1200, category: 'service' },
      { description: 'Relatório de recomendações e próximos passos', unit: 'relatório', quantity: 1, unitPrice: 900, category: 'service' }
    ]
  },
  {
    id: 'obra_completa',
    label: 'Obra completa',
    description: 'Proposta para gestão, acompanhamento e coordenação de reforma até entrega.',
    paymentTerms: '20% na contratação, 60% parcelado conforme cronograma físico-financeiro e 20% na entrega da obra.',
    deliveryTerms: 'Prazo definido após cronograma detalhado, disponibilidade de equipes, materiais e aprovações necessárias.',
    notes: 'Inclui planejamento da obra, acompanhamento técnico, gestão de fornecedores, controle de custos e relatórios de andamento.',
    items: [
      { description: 'Planejamento executivo, cronograma e organização da obra', unit: 'etapa', quantity: 1, unitPrice: 6500, category: 'service' },
      { description: 'Coordenação técnica de fornecedores e frentes de serviço', unit: 'mês', quantity: 3, unitPrice: 5200, category: 'service' },
      { description: 'Vistorias, registros fotográficos e relatórios de evolução', unit: 'mês', quantity: 3, unitPrice: 2800, category: 'service' },
      { description: 'Entrega técnica, checklist final e termo de conclusão', unit: 'etapa', quantity: 1, unitPrice: 3500, category: 'service' }
    ]
  },
  {
    id: 'comercial',
    label: 'Ambiente comercial',
    description: 'Projeto para loja, clínica, sala comercial ou escritório com foco em operação.',
    paymentTerms: '35% na aprovação, 35% na validação do layout e 30% na entrega do executivo.',
    deliveryTerms: 'Prazo estimado de 40 a 55 dias, sujeito à aprovação de layout, normas do imóvel e informações técnicas.',
    notes: 'Inclui estudo de fluxo, layout operacional, identidade do ambiente, especificações e detalhamento para execução.',
    items: [
      { description: 'Diagnóstico de operação, público e fluxo de atendimento', unit: 'etapa', quantity: 1, unitPrice: 4200, category: 'service' },
      { description: 'Layout comercial e estudo de experiência do usuário', unit: 'etapa', quantity: 1, unitPrice: 6800, category: 'service' },
      { description: 'Projeto executivo, detalhamento técnico e acabamentos', unit: 'etapa', quantity: 1, unitPrice: 11800, category: 'service' },
      { description: 'Memorial de materiais, mobiliário e comunicação visual', unit: 'etapa', quantity: 1, unitPrice: 3900, category: 'service' }
    ]
  }
] as const;

const ProposalsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string, clientId?: string, clientName?: string }[]>([]);
  const [clients, setClients] = useState<{ id: string, nome: string, briefing?: any, imovel?: any }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [officeProfile, setOfficeProfile] = useState<OfficeProfile | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<'summary' | 'items' | 'history' | 'contracts' | 'actions'>('summary');
  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProposals();
      fetchProjects();
      fetchClients();
      fetchOfficeProfile();
    }
  }, [user]);

  const generateProposalNumber = () => {
    const year = new Date().getFullYear();
    const next = String(proposals.length + 1).padStart(3, '0');
    return `${year}-${next}`;
  };

  const getDefaultItemFromClient = (client?: any): ProposalItem[] => {
    const tipoProjeto = client?.briefing?.tipoProjeto || client?.imovel?.tipo || 'Projeto de arquitetura/reforma';
    const objetivo = client?.briefing?.objetivo ? ` - ${client.briefing.objetivo}` : '';

    return [{
      id: Date.now().toString(),
      description: `${tipoProjeto}${objetivo}`.slice(0, 180),
      unit: 'serv',
      quantity: 1,
      unitPrice: 0,
      category: 'service'
    }];
  };

  const resetForm = (client?: any) => {
    setFormData({
      proposalNumber: generateProposalNumber(),
      proposalDate: new Date().toISOString().split('T')[0],
      clientId: client?.id || '',
      client: client?.nome || '',
      projetoId: '',
      status: 'sent',
      notes: client?.briefing?.observacoesComerciais || '',
      paymentTerms: '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
      deliveryTerms: 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
      validityDays: 15,
      items: getDefaultItemFromClient(client)
    });
  };

  useEffect(() => {
    if (location.state && (location.state as any).createForClient) {
      const client = (location.state as any).createForClient;
      resetForm(client);
      setShowFormModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, proposals.length]);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        projects (name),
        clients (telefones),
        proposal_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
    } else {
      const mappedProposals = (data || []).map(p => ({
        id: p.id,
        clientId: p.client_id,
        projectId: p.project_id,
        proposalNumber: p.proposal_number,
        proposalDate: p.proposal_date,
        client: p.client_name,
        clientPhone: p.clients?.telefones?.whatsapp || p.clients?.telefones?.celular || '',
        company: user?.company || 'Individual',
        projetoNome: p.projects?.name || p.project_name || 'Geral',
        total: Number(p.total || 0),
        status: p.status as any,
        publicToken: p.public_token || '',
        createdAt: p.created_at,
        itemsCount: p.proposal_items?.length || 0,
        items: (p.proposal_items || []).map((item: any) => ({
          id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unit_price || 0),
          category: item.category
        })),
        ...parseProposalNotes(p.observacoes)
      }));

      setProposals(mappedProposals);
      await fetchProposalEvents(mappedProposals.map((proposal: Proposal) => proposal.id));
      await fetchProposalContracts(mappedProposals.map((proposal: Proposal) => proposal.id));
    }
    setLoading(false);
  };

  const fetchProposalEvents = async (proposalIds: string[]) => {
    if (!proposalIds.length) return;

    const { data, error } = await supabase
      .from('proposal_events')
      .select('id, proposal_id, event_type, title, details, actor_type, created_at')
      .in('proposal_id', proposalIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Proposal audit events unavailable:', error.message);
      return;
    }

    const eventsByProposal = (data || []).reduce((acc: Record<string, ProposalEvent[]>, event: any) => {
      const proposalId = event.proposal_id;
      acc[proposalId] = acc[proposalId] || [];
      acc[proposalId].push({
        id: event.id,
        type: event.event_type,
        title: event.title,
        details: event.details || '',
        actorType: event.actor_type || 'system',
        createdAt: event.created_at
      });
      return acc;
    }, {});

    setProposals((current) => current.map((proposal) => ({
      ...proposal,
      events: eventsByProposal[proposal.id] || []
    })));
  };

  const fetchProposalContracts = async (proposalIds: string[]) => {
    if (!proposalIds.length) return;

    const { data, error } = await supabase
      .from('proposal_contract_files')
      .select('id, proposal_id, file_name, file_path, file_type, file_size, status, uploaded_at, notes')
      .in('proposal_id', proposalIds)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.warn('Proposal contract files unavailable:', error.message);
      return;
    }

    const contractsByProposal = (data || []).reduce((acc: Record<string, ProposalContractFile[]>, file: any) => {
      const proposalId = file.proposal_id;
      acc[proposalId] = acc[proposalId] || [];
      acc[proposalId].push({
        id: file.id,
        fileName: file.file_name,
        filePath: file.file_path,
        fileType: file.file_type || '',
        fileSize: Number(file.file_size || 0),
        status: file.status || 'signed',
        uploadedAt: file.uploaded_at,
        notes: file.notes || ''
      });
      return acc;
    }, {});

    setProposals((current) => current.map((proposal) => ({
      ...proposal,
      contracts: contractsByProposal[proposal.id] || []
    })));
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name, client_id, client_name');
    if (data) {
      setProjects(data.map((project: any) => ({
        id: project.id,
        name: project.name,
        clientId: project.client_id,
        clientName: project.client_name
      })));
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, nome, briefing, imovel')
      .order('nome');
    if (data) setClients(data);
  };

  const fetchOfficeProfile = async () => {
    if (!user?.id) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_name, cnpj, phone, website, avatar_url, address, email')
      .eq('id', user.id)
      .maybeSingle();

    let organization: any = null;
    if (user.organization?.id) {
      const { data } = await supabase
        .from('organizations')
        .select('name, document, email, phone, website, logo_url, address')
        .eq('id', user.organization.id)
        .maybeSingle();
      organization = data;
    }

    setOfficeProfile({
      name: organization?.name || profile?.company_name || user.company || 'Seu Escritório',
      cnpj: organization?.document || profile?.cnpj || '',
      email: organization?.email || profile?.email || user.email,
      phone: organization?.phone || profile?.phone || '',
      website: organization?.website || profile?.website || '',
      logo: organization?.logo_url || profile?.avatar_url || null,
      address: organization?.address || profile?.address || {}
    });
  };


  const [formData, setFormData] = useState<any>({
    proposalNumber: '',
    proposalDate: new Date().toISOString().split('T')[0],
    clientId: '',
    client: '',
    projetoId: '',
    status: 'sent',
    notes: '',
    paymentTerms: '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
    deliveryTerms: 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
    validityDays: 15,
    items: [{
      id: '1',
      description: '',
      unit: 'serv',
      quantity: 1,
      unitPrice: 0,
      category: 'service'
    }]
  });

  const parseProposalNotes = (rawNotes?: string | null) => {
    if (!rawNotes) {
      return {
        notes: '',
        paymentTerms: '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
        deliveryTerms: 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
        validityDays: 15,
        acceptedAt: '',
        acceptedBy: '',
        acceptanceMethod: '',
        acceptanceNotes: ''
      };
    }

    try {
      const parsed = JSON.parse(rawNotes);
      return {
        notes: parsed.notes || '',
        paymentTerms: parsed.paymentTerms || '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
        deliveryTerms: parsed.deliveryTerms || 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
        validityDays: Number(parsed.validityDays || 15),
        acceptedAt: parsed.acceptedAt || '',
        acceptedBy: parsed.acceptedBy || '',
        acceptanceMethod: parsed.acceptanceMethod || '',
        acceptanceNotes: parsed.acceptanceNotes || ''
      };
    } catch {
      return {
        notes: rawNotes,
        paymentTerms: '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
        deliveryTerms: 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
        validityDays: 15,
        acceptedAt: '',
        acceptedBy: '',
        acceptanceMethod: '',
        acceptanceNotes: ''
      };
    }
  };

  const buildProposalNotesPayload = (source: any, extra: Record<string, any> = {}) => ({
    notes: source.notes || '',
    paymentTerms: source.paymentTerms || '',
    deliveryTerms: source.deliveryTerms || '',
    validityDays: Number(source.validityDays || 15),
    isDemo: Boolean(source.isDemo),
    acceptedAt: source.acceptedAt || '',
    acceptedBy: source.acceptedBy || '',
    acceptanceMethod: source.acceptanceMethod || '',
    acceptanceNotes: source.acceptanceNotes || '',
    ...extra
  });

  const buildProposalNotes = () => JSON.stringify(buildProposalNotesPayload(formData));

  const escapeHtml = (value?: string | number | null) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');

  const formatDateTime = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const sanitizeFileName = (fileName: string) => fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  const formatTimelineDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const recordProposalEvent = async (
    proposalId: string,
    eventType: string,
    title: string,
    details?: string,
    metadata: Record<string, any> = {},
    actorType: ProposalEvent['actorType'] = 'user'
  ) => {
    if (!user?.id || !proposalId) return;

    const { error } = await supabase.from('proposal_events').insert([{
      user_id: user.id,
      proposal_id: proposalId,
      event_type: eventType,
      title,
      details: details || null,
      actor_type: actorType,
      metadata
    }]);

    if (error) {
      console.warn('Could not record proposal event:', error.message);
    }
  };

  const getProposalTimeline = (proposal: Proposal): ProposalEvent[] => {
    const syntheticEvents: ProposalEvent[] = [
      {
        id: `${proposal.id}-created`,
        type: 'created',
        title: 'Proposta criada',
        details: proposal.proposalNumber,
        actorType: 'system',
        createdAt: proposal.createdAt
      }
    ];

    if (proposal.publicToken) {
      syntheticEvents.push({
        id: `${proposal.id}-public-link`,
        type: 'public_link_created',
        title: 'Link do cliente ativo',
        details: 'Portal publico disponivel para envio',
        actorType: 'system',
        createdAt: proposal.createdAt
      });
    }

    if (proposal.acceptedAt) {
      syntheticEvents.push({
        id: `${proposal.id}-accepted`,
        type: proposal.acceptanceMethod === 'public_link' ? 'accepted_public' : 'accepted_internal',
        title: proposal.acceptanceMethod === 'public_link' ? 'Aceite pelo portal publico' : 'Aceite interno registrado',
        details: proposal.acceptedBy || proposal.client,
        actorType: proposal.acceptanceMethod === 'public_link' ? 'client' : 'user',
        createdAt: proposal.acceptedAt
      });
    }

    (proposal.contracts || []).forEach((contract) => {
      syntheticEvents.push({
        id: `${proposal.id}-contract-${contract.id}`,
        type: 'signed_contract_uploaded',
        title: 'Contrato assinado anexado',
        details: contract.fileName,
        actorType: 'user',
        createdAt: contract.uploadedAt
      });
    });

    const eventMap = new Map<string, ProposalEvent>();
    [...syntheticEvents, ...(proposal.events || [])].forEach((event) => {
      const key = `${event.type}-${event.createdAt}-${event.title}`;
      eventMap.set(key, event);
    });

    return Array.from(eventMap.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  };

  const getOfficeAddress = () => {
    const address = officeProfile?.address || {};
    return [address.logradouro, address.numero, address.bairro, address.cidade, address.uf]
      .filter(Boolean)
      .join(', ');
  };

  // Função para abrir o visualizador de proposta digital
  const handleViewProposal = (proposal: Proposal) => {
    const win = window.open('', '_blank');
    if (win) {
      const subtotal = proposal.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      const validUntil = new Date(`${proposal.proposalDate}T00:00:00`);
      validUntil.setDate(validUntil.getDate() + (proposal.validityDays || 15));
      const officeAddress = getOfficeAddress();
      const statusLabel = {
        approved: 'Aprovada',
        draft: 'Rascunho',
        sent: 'Enviada',
        rejected: 'Rejeitada'
      }[proposal.status];

      win.document.write(`
        <html>
          <head>
            <title>Proposta Comercial - ${proposal.proposalNumber}</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
              .toolbar { position: sticky; top: 0; z-index: 5; display: flex; justify-content: center; gap: 12px; padding: 14px; background: rgba(17,24,39,.92); backdrop-filter: blur(8px); }
              .toolbar button { border: 0; border-radius: 999px; padding: 12px 22px; background: #0f766e; color: white; font-weight: 800; cursor: pointer; }
              .page { width: 210mm; min-height: 297mm; margin: 24px auto; background: white; box-shadow: 0 24px 80px rgba(15,23,42,.24); overflow: hidden; }
              .hero { background: linear-gradient(135deg, #0f172a 0%, #0f766e 100%); color: white; padding: 34px 42px 30px; }
              .brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; }
              .logoBox { width: 76px; height: 76px; border-radius: 20px; background: rgba(255,255,255,.14); display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 28px; font-weight: 900; }
              .logoBox img { max-width: 100%; max-height: 100%; object-fit: contain; padding: 8px; }
              .office h1 { margin: 0 0 8px; font-size: 25px; letter-spacing: .2px; }
              .office p, .meta p { margin: 3px 0; color: rgba(255,255,255,.78); font-size: 12px; line-height: 1.45; }
              .title { margin-top: 38px; display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; }
              .title h2 { margin: 0; font-size: 42px; line-height: .98; letter-spacing: -1px; }
              .badge { display: inline-block; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .9px; }
              .content { padding: 36px 42px 42px; }
              .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 18px; margin-bottom: 28px; }
              .card { border: 1px solid #e5e7eb; border-radius: 18px; padding: 20px; background: #f8fafc; }
              .label { margin: 0 0 8px; color: #0f766e; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; }
              .value { margin: 0; color: #111827; font-size: 18px; font-weight: 900; }
              .muted { color: #64748b; font-size: 12px; line-height: 1.55; }
              .section { margin-top: 30px; }
              .section h3 { margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 1.4px; color: #0f766e; }
              table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 16px; border-style: hidden; box-shadow: 0 0 0 1px #e5e7eb; }
              th { padding: 13px 14px; text-align: left; color: #475569; background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: .9px; }
              td { padding: 15px 14px; border-top: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
              td strong { font-size: 13px; color: #111827; }
              .right { text-align: right; }
              .center { text-align: center; }
              .summary { margin-top: 22px; margin-left: auto; width: 300px; border: 1px solid #e5e7eb; border-radius: 18px; overflow: hidden; }
              .summaryRow { display: flex; justify-content: space-between; gap: 16px; padding: 13px 16px; font-size: 12px; }
              .summaryTotal { background: #0f766e; color: white; font-size: 18px; font-weight: 900; }
              .terms { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
              .note { white-space: pre-wrap; }
              .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; margin-top: 54px; }
              .line { border-top: 1px solid #94a3b8; padding-top: 10px; color: #475569; font-size: 12px; text-align: center; }
              .footer { margin-top: 34px; padding-top: 18px; border-top: 1px solid #e5e7eb; color: #94a3b8; font-size: 10px; text-align: center; }
              @page { size: A4; margin: 0; }
              @media print {
                body { background: white; }
                .toolbar { display: none; }
                .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <button onclick="window.print()">Imprimir / Salvar PDF</button>
            </div>
            <main class="page">
              <section class="hero">
                <div class="brand">
                  <div style="display:flex; gap:18px; align-items:flex-start;">
                    <div class="logoBox">
                      ${officeProfile?.logo ? `<img src="${escapeHtml(officeProfile.logo)}" />` : escapeHtml((officeProfile?.name || proposal.company || 'P').charAt(0))}
                    </div>
                    <div class="office">
                      <h1>${escapeHtml(officeProfile?.name || proposal.company || 'Seu Escritório')}</h1>
                      <p>${escapeHtml(officeAddress || 'Endereço não informado')}</p>
                      <p>${escapeHtml(officeProfile?.email || '')}${officeProfile?.phone ? ` • ${escapeHtml(officeProfile.phone)}` : ''}</p>
                      <p>${officeProfile?.cnpj ? `CNPJ/Registro: ${escapeHtml(officeProfile.cnpj)}` : ''}${officeProfile?.website ? ` • ${escapeHtml(officeProfile.website)}` : ''}</p>
                    </div>
                  </div>
                  <div class="meta" style="text-align:right;">
                    <span class="badge">${escapeHtml(statusLabel)}</span>
                    <p style="margin-top:14px;">Proposta Nº <strong>${escapeHtml(proposal.proposalNumber)}</strong></p>
                    <p>Emissão: ${escapeHtml(formatDate(proposal.proposalDate))}</p>
                    <p>Validade: ${escapeHtml(validUntil.toLocaleDateString('pt-BR'))}</p>
                  </div>
                </div>
                <div class="title">
                  <h2>Proposta<br/>Comercial</h2>
                  <p style="max-width:310px;color:rgba(255,255,255,.78);line-height:1.5;font-size:13px;">Escopo, investimento e condições comerciais para execução dos serviços descritos nesta proposta.</p>
                </div>
              </section>

              <section class="content">
                <div class="grid">
                  <div class="card">
                    <p class="label">Cliente</p>
                    <p class="value">${escapeHtml(proposal.client)}</p>
                    <p class="muted">Projeto relacionado: ${escapeHtml(proposal.projetoNome || 'Geral')}</p>
                  </div>
                  <div class="card">
                    <p class="label">Investimento Total</p>
                    <p class="value">${escapeHtml(formatCurrency(proposal.total))}</p>
                    <p class="muted">${proposal.items.length} item(ns) de escopo comercial</p>
                  </div>
                </div>

                <div class="section">
                  <h3>Escopo e Itens</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Descrição</th>
                        <th class="center">Un.</th>
                        <th class="center">Qtd.</th>
                        <th class="right">Unitário</th>
                        <th class="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${proposal.items.map(item => `
                        <tr>
                          <td><strong>${escapeHtml(item.description)}</strong><br/><span class="muted">${item.category === 'service' ? 'Serviço técnico' : 'Produto/material'}</span></td>
                          <td class="center">${escapeHtml(item.unit || 'un')}</td>
                          <td class="center">${escapeHtml(item.quantity)}</td>
                          <td class="right">${escapeHtml(formatCurrency(item.unitPrice))}</td>
                          <td class="right"><strong>${escapeHtml(formatCurrency(item.quantity * item.unitPrice))}</strong></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  <div class="summary">
                    <div class="summaryRow"><span>Subtotal</span><strong>${escapeHtml(formatCurrency(subtotal))}</strong></div>
                    <div class="summaryRow"><span>Descontos/Taxas</span><strong>${escapeHtml(formatCurrency(proposal.total - subtotal))}</strong></div>
                    <div class="summaryRow summaryTotal"><span>Total</span><span>${escapeHtml(formatCurrency(proposal.total))}</span></div>
                  </div>
                </div>

                <div class="section terms">
                  <div class="card">
                    <p class="label">Condições de Pagamento</p>
                    <p class="muted note">${escapeHtml(proposal.paymentTerms || 'A combinar.')}</p>
                  </div>
                  <div class="card">
                    <p class="label">Prazos e Premissas</p>
                    <p class="muted note">${escapeHtml(proposal.deliveryTerms || 'Prazos sujeitos à aprovação do escopo e disponibilidade de informações.')}</p>
                  </div>
                </div>

                ${proposal.notes ? `
                  <div class="section">
                    <div class="card">
                      <p class="label">Observações Comerciais</p>
                      <p class="muted note">${escapeHtml(proposal.notes)}</p>
                    </div>
                  </div>
                ` : ''}

                <div class="signature">
                  <div class="line">${escapeHtml(officeProfile?.name || proposal.company || 'Escritório')}</div>
                  <div class="line">${escapeHtml(proposal.client)}</div>
                </div>

                <div class="footer">
                  Esta proposta é válida até ${escapeHtml(validUntil.toLocaleDateString('pt-BR'))}. Alterações de escopo, materiais, prazos ou condições de execução podem gerar revisão de valores.
                </div>
              </section>
            </main>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const handleViewContract = (proposal: Proposal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const win = window.open('', '_blank');
    if (!win) return;

    const officeAddress = getOfficeAddress();
    const contractDate = new Date().toLocaleDateString('pt-BR');
    const acceptanceRecord = proposal.acceptedAt
      ? `Aceite interno registrado em ${formatDateTime(proposal.acceptedAt)} por ${proposal.acceptedBy || proposal.client}.`
      : 'Aceite pendente de assinatura ou confirmação formal pelo contratante.';
    const itemsRows = proposal.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td class="right">${escapeHtml(formatCurrency(item.quantity * item.unitPrice))}</td>
      </tr>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>Termo de Aceite - ${escapeHtml(proposal.proposalNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
            .toolbar { position: sticky; top: 0; z-index: 5; display: flex; justify-content: center; padding: 14px; background: rgba(17,24,39,.92); }
            .toolbar button { border: 0; border-radius: 999px; padding: 12px 22px; background: #0f766e; color: white; font-weight: 800; cursor: pointer; }
            .page { width: 210mm; min-height: 297mm; margin: 24px auto; background: white; padding: 22mm; box-shadow: 0 24px 80px rgba(15,23,42,.24); }
            header { border-bottom: 3px solid #0f766e; padding-bottom: 18px; margin-bottom: 24px; display: flex; justify-content: space-between; gap: 28px; }
            h1 { margin: 0; font-size: 28px; line-height: 1; color: #0f172a; }
            h2 { margin: 26px 0 10px; font-size: 13px; color: #0f766e; text-transform: uppercase; letter-spacing: 1.4px; }
            p, li { font-size: 12.5px; line-height: 1.65; color: #334155; }
            .muted { color: #64748b; font-size: 11px; }
            .box { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 16px; margin: 14px 0; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1px #e2e8f0; }
            th { background: #f1f5f9; color: #475569; text-align: left; padding: 11px; font-size: 10px; text-transform: uppercase; letter-spacing: .8px; }
            td { border-top: 1px solid #e2e8f0; padding: 12px; font-size: 12px; vertical-align: top; }
            .right { text-align: right; }
            .total { margin-left: auto; margin-top: 16px; width: 310px; background: #0f766e; color: white; border-radius: 14px; padding: 16px; display: flex; justify-content: space-between; font-weight: 900; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 46px; margin-top: 62px; }
            .line { border-top: 1px solid #64748b; padding-top: 10px; text-align: center; font-size: 12px; color: #475569; }
            footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
            @page { size: A4; margin: 0; }
            @media print {
              body { background: white; }
              .toolbar { display: none; }
              .page { margin: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
          <main class="page">
            <header>
              <div>
                <h1>Termo de Aceite e Contratação</h1>
                <p class="muted">Referente à proposta comercial nº ${escapeHtml(proposal.proposalNumber)}</p>
              </div>
              <div style="text-align:right">
                <p><strong>Data:</strong> ${escapeHtml(contractDate)}</p>
                <p><strong>Valor:</strong> ${escapeHtml(formatCurrency(proposal.total))}</p>
              </div>
            </header>

            <section class="grid">
              <div class="box">
                <h2>Contratada</h2>
                <p><strong>${escapeHtml(officeProfile?.name || proposal.company || 'Escritório')}</strong></p>
                <p>${escapeHtml(officeProfile?.cnpj || 'CNPJ/Registro não informado')}</p>
                <p>${escapeHtml(officeProfile?.email || '')}${officeProfile?.phone ? ` • ${escapeHtml(officeProfile.phone)}` : ''}</p>
                <p>${escapeHtml(officeAddress || 'Endereço não informado')}</p>
              </div>
              <div class="box">
                <h2>Contratante</h2>
                <p><strong>${escapeHtml(proposal.client)}</strong></p>
                <p>Projeto/obra: ${escapeHtml(proposal.projetoNome || 'Geral')}</p>
                <p>Dados complementares deverão ser confirmados no cadastro do cliente.</p>
              </div>
            </section>

            <h2>1. Objeto</h2>
            <p>O presente termo formaliza o aceite da proposta comercial nº ${escapeHtml(proposal.proposalNumber)}, cujo escopo contempla os serviços e entregáveis descritos abaixo.</p>

            <h2>2. Escopo Contratado</h2>
            <table>
              <thead>
                <tr><th>#</th><th>Descrição</th><th class="right">Valor</th></tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>
            <div class="total"><span>Valor total contratado</span><span>${escapeHtml(formatCurrency(proposal.total))}</span></div>

            <h2>3. Condições de Pagamento</h2>
            <p>${escapeHtml(proposal.paymentTerms || 'As condições de pagamento serão acordadas entre as partes.')}</p>

            <h2>4. Prazos, Premissas e Responsabilidades</h2>
            <p>${escapeHtml(proposal.deliveryTerms || 'Os prazos dependem da aprovação do escopo, disponibilidade de informações, medições e retorno do contratante.')}</p>
            <ul>
              <li>Alterações de escopo, materiais, metragens ou premissas poderão gerar revisão de prazo e valor.</li>
              <li>O início dos serviços depende do aceite deste termo e do cumprimento da condição inicial de pagamento, quando aplicável.</li>
              <li>Este termo não substitui exigências legais específicas, ART/RRT ou contratos complementares quando forem necessários.</li>
            </ul>

            <h2>5. Observações</h2>
            <p>${escapeHtml(proposal.notes || 'Sem observações adicionais.')}</p>

            <h2>6. Aceite</h2>
            <p>Ao assinar este termo, as partes declaram ciência e concordância com o escopo, valores, condições comerciais e premissas descritas.</p>
            <div class="box">
              <p><strong>Registro no PrecificaPro:</strong> ${escapeHtml(acceptanceRecord)}</p>
              ${proposal.acceptanceNotes ? `<p>${escapeHtml(proposal.acceptanceNotes)}</p>` : ''}
            </div>

            <div class="signatures">
              <div class="line">${escapeHtml(officeProfile?.name || proposal.company || 'Contratada')}</div>
              <div class="line">${escapeHtml(proposal.client)}<br/>Contratante</div>
            </div>

            <footer>Documento gerado pelo PrecificaPro em ${escapeHtml(contractDate)}.</footer>
          </main>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = formData.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);
    const selectedProject = projects.find((project) => project.id === formData.projetoId);

    const payload = {
      user_id: user?.id,
      project_id: formData.projetoId || null,
      client_id: formData.clientId || null,
      proposal_number: formData.proposalNumber,
      proposal_date: formData.proposalDate,
      client_name: formData.client,
      company_name: user?.company || 'Individual',
      project_name: selectedProject?.name || '',
      total,
      status: formData.status,
      observacoes: buildProposalNotes()
    };

    const { data: proposal, error } = await supabase.from('proposals').insert([payload]).select('id').single();

    if (error) {
      alert('Erro ao salvar proposta: ' + error.message);
    } else {
      const itemsPayload = formData.items
        .filter((item: any) => item.description)
        .map((item: any) => ({
          proposal_id: proposal.id,
          description: item.description,
          unit: item.unit || 'serv',
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.unitPrice) || 0,
          category: item.category || 'service'
        }));

      if (itemsPayload.length) {
        const { error: itemsError } = await supabase.from('proposal_items').insert(itemsPayload);
        if (itemsError) {
          alert('Proposta criada, mas houve erro ao salvar itens: ' + itemsError.message);
        }
      }

      if (formData.clientId) {
        await supabase
          .from('clients')
          .update({ status: 'proposta_enviada' })
          .eq('id', formData.clientId);
      }

      await recordProposalEvent(
        proposal.id,
        'created',
        'Proposta criada',
        `Proposta ${formData.proposalNumber} criada para ${formData.client}.`,
        { total }
      );

      await fetchProposals();
      setShowFormModal(false);
      setMessage({ text: 'Proposta criada e lead movido para Proposta enviada.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
    }
  };

  const handleOpenNewProposal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          id: Date.now().toString(),
          description: '',
          unit: 'serv',
          quantity: 1,
          unitPrice: 0,
          category: 'service'
        }
      ]
    });
  };

  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map((item: any) => item.id === itemId ? { ...item, [field]: value } : item)
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setFormData({
      ...formData,
      items: formData.items.filter((item: any) => item.id !== itemId)
    });
  };

  const buildShareSummary = (proposal: Proposal) => {
    const validUntil = new Date(`${proposal.proposalDate}T00:00:00`);
    validUntil.setDate(validUntil.getDate() + (proposal.validityDays || 15));

    const items = proposal.items
      .slice(0, 5)
      .map((item) => `- ${item.description}: ${formatCurrency(item.quantity * item.unitPrice)}`)
      .join('\n');

    return [
      `Olá ${proposal.client}, tudo bem?`,
      '',
      `Segue o resumo da proposta ${proposal.proposalNumber} para ${proposal.projetoNome || 'seu projeto'}.`,
      '',
      items,
      '',
      `Investimento total: ${formatCurrency(proposal.total)}`,
      `Validade: ${validUntil.toLocaleDateString('pt-BR')}`,
      '',
      'Posso te apresentar os detalhes e próximos passos?'
    ].join('\n');
  };

  const handleCopyProposalSummary = async (proposal: Proposal, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const summary = buildShareSummary(proposal);
    try {
      await navigator.clipboard.writeText(summary);
      await recordProposalEvent(
        proposal.id,
        'summary_copied',
        'Resumo copiado',
        'Resumo comercial copiado para envio manual.',
        { proposalNumber: proposal.proposalNumber }
      );
      setMessage({ text: 'Resumo da proposta copiado.', type: 'success' });
    } catch {
      setMessage({ text: 'Não foi possível copiar automaticamente. Abra a proposta e copie manualmente.', type: 'error' });
    }
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSendProposalWhatsapp = (proposal: Proposal, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (!proposal.clientPhone) {
      setMessage({ text: 'Este cliente não tem WhatsApp cadastrado. Use Copiar resumo.', type: 'error' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    recordProposalEvent(
      proposal.id,
      'sent_whatsapp',
      'Proposta enviada por WhatsApp',
      `Mensagem preparada para ${proposal.clientPhone}.`,
      { proposalNumber: proposal.proposalNumber }
    );
    window.open(createWhatsappLink(proposal.clientPhone, buildShareSummary(proposal)), '_blank');
  };

  const generatePublicToken = () => {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID().replace(/-/g, '');
    }
    return `${Date.now()}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  };

  const getPublicProposalUrl = (publicToken: string) => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}#/public/proposal/${publicToken}`;
  };

  const handleCopyPublicProposalLink = async (proposal: Proposal, e?: React.MouseEvent) => {
    e?.stopPropagation();

    let publicToken = proposal.publicToken;

    if (!publicToken) {
      publicToken = generatePublicToken();
      const { error } = await supabase
        .from('proposals')
        .update({
          public_token: publicToken,
          public_token_created_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (error) {
        setMessage({
          text: 'Nao foi possivel gerar o link publico. Aplique a migration 00003_public_proposal_portal.sql no Supabase e tente novamente.',
          type: 'error'
        });
        setTimeout(() => setMessage(null), 6000);
        return;
      }

      setProposals((current) => current.map((item) => (
        item.id === proposal.id ? { ...item, publicToken } : item
      )));

      await recordProposalEvent(
        proposal.id,
        'public_link_created',
        'Link do cliente criado',
        'Portal publico da proposta foi habilitado.',
        { publicToken }
      );
    }

    try {
      await navigator.clipboard.writeText(getPublicProposalUrl(publicToken));
      await recordProposalEvent(
        proposal.id,
        'public_link_copied',
        'Link do cliente copiado',
        'Link publico copiado para envio ao cliente.',
        { publicToken }
      );
      setMessage({ text: 'Link publico da proposta copiado.', type: 'success' });
    } catch {
      setMessage({ text: getPublicProposalUrl(publicToken), type: 'success' });
    }
    setTimeout(() => setMessage(null), 5000);
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = proposalTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setFormData({
      ...formData,
      templateId,
      notes: template.notes,
      paymentTerms: template.paymentTerms,
      deliveryTerms: template.deliveryTerms,
      validityDays: 15,
      items: template.items.map((item, index) => ({
        id: `${template.id}-${index}-${Date.now()}`,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        category: item.category as 'product' | 'service'
      }))
    });
  };

  const buildAcceptanceNotes = (proposal: Proposal, projectId?: string) => JSON.stringify(buildProposalNotesPayload(proposal, {
    acceptedAt: proposal.acceptedAt || new Date().toISOString(),
    acceptedBy: proposal.acceptedBy || proposal.client,
    acceptanceMethod: proposal.acceptanceMethod || 'internal',
    acceptanceNotes: proposal.acceptanceNotes || (projectId
      ? 'Aceite registrado internamente ao converter a proposta em obra.'
      : 'Aceite registrado internamente pelo escritório.')
  }));

  const handleRegisterAcceptance = async (proposal: Proposal, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (proposal.status === 'approved' && proposal.acceptedAt) {
      setMessage({ text: 'Esta proposta já tem aceite registrado.', type: 'success' });
      setTimeout(() => setMessage(null), 3500);
      return;
    }

    const { error } = await supabase
      .from('proposals')
      .update({
        status: 'approved',
        observacoes: buildAcceptanceNotes(proposal)
      })
      .eq('id', proposal.id);

    if (error) {
      setMessage({ text: 'Erro ao registrar aceite: ' + error.message, type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    if (proposal.clientId) {
      await supabase
        .from('clients')
        .update({ status: 'contratado' })
        .eq('id', proposal.clientId);
    }

    await recordProposalEvent(
      proposal.id,
      'accepted_internal',
      'Aceite interno registrado',
      `Aceite registrado por ${proposal.client}.`,
      { acceptedBy: proposal.client }
    );

    await fetchProposals();
    setMessage({ text: 'Aceite registrado e lead marcado como contratado.', type: 'success' });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleApproveAndCreateProject = async (proposal: Proposal, e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (proposal.status === 'approved' && proposal.projectId) {
      navigate('/projects');
      return;
    }

    let projectId = proposal.projectId;

    if (!projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          user_id: user?.id,
          name: proposal.projetoNome !== 'Geral' ? proposal.projetoNome : `Obra - ${proposal.client}`,
          client_id: proposal.clientId || null,
          client_name: proposal.client,
          total_budget: proposal.total,
          spent_amount: 0,
          start_date: new Date().toISOString().split('T')[0],
          status: 'active'
        }])
        .select('id')
        .single();

      if (projectError) {
        setMessage({ text: 'Erro ao criar obra a partir da proposta: ' + projectError.message, type: 'error' });
        setTimeout(() => setMessage(null), 4500);
        return;
      }

      projectId = project.id;
    }

    await supabase
      .from('proposals')
      .update({
        status: 'approved',
        project_id: projectId,
        observacoes: buildAcceptanceNotes(proposal, projectId)
      })
      .eq('id', proposal.id);

    if (proposal.clientId) {
      await supabase
        .from('clients')
        .update({ status: 'contratado' })
        .eq('id', proposal.clientId);
    }

    await recordProposalEvent(
      proposal.id,
      'converted_to_project',
      'Proposta convertida em obra',
      `Obra criada para ${proposal.client}.`,
      { projectId }
    );

    await fetchProposals();
    setMessage({ text: 'Proposta aprovada e obra criada com sucesso.', type: 'success' });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSignedContractUpload = async (proposal: Proposal, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user?.id) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ text: 'Envie um PDF ou imagem PNG/JPG/WebP do contrato assinado.', type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage({ text: 'Arquivo muito grande. O limite para contrato assinado é 10MB.', type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    setUploadingContractId(proposal.id);
    const filePath = `${user.id}/${proposal.id}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from('proposal-contracts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      setUploadingContractId(null);
      setMessage({
        text: 'Erro ao enviar contrato. Aplique a migration 00005_proposal_signed_contracts.sql no Supabase e tente novamente.',
        type: 'error'
      });
      setTimeout(() => setMessage(null), 6500);
      return;
    }

    const { error: metadataError } = await supabase
      .from('proposal_contract_files')
      .insert([{
        user_id: user.id,
        proposal_id: proposal.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        status: 'signed',
        notes: 'Contrato assinado anexado ao dossiê da proposta.'
      }]);

    if (metadataError) {
      await supabase.storage.from('proposal-contracts').remove([filePath]);
      setUploadingContractId(null);
      setMessage({ text: 'Arquivo enviado, mas houve erro ao registrar no histórico: ' + metadataError.message, type: 'error' });
      setTimeout(() => setMessage(null), 6500);
      return;
    }

    await recordProposalEvent(
      proposal.id,
      'signed_contract_uploaded',
      'Contrato assinado anexado',
      file.name,
      { fileName: file.name, fileSize: file.size, fileType: file.type }
    );

    await fetchProposals();
    setUploadingContractId(null);
    setMessage({ text: 'Contrato assinado anexado com sucesso.', type: 'success' });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleOpenSignedContract = async (contract: ProposalContractFile) => {
    const { data, error } = await supabase.storage
      .from('proposal-contracts')
      .createSignedUrl(contract.filePath, 60);

    if (error || !data?.signedUrl) {
      setMessage({ text: 'Não foi possível abrir o contrato assinado: ' + (error?.message || 'link indisponível'), type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  const handleCreateDemoProposal = async () => {
    if (!user?.id) return;

    const demoNumber = `DEMO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const demoNotes = JSON.stringify({
      notes: 'Proposta demonstrativa criada para visualizar o modelo apresentável. Pode ser removida pelo botão Limpar demos.',
      paymentTerms: '30% na aprovação, 40% na apresentação do anteprojeto e 30% na entrega final dos documentos.',
      deliveryTerms: 'Prazo estimado de 45 dias após aprovação da proposta, recebimento das medidas e validação do briefing.',
      validityDays: 15,
      isDemo: true
    });

    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert([{
        user_id: user.id,
        proposal_number: demoNumber,
        proposal_date: new Date().toISOString().split('T')[0],
        client_name: 'Cliente Demonstração',
        company_name: officeProfile?.name || user.company || 'PrecificaPro',
        project_name: 'Reforma Apartamento 82m²',
        total: 28500,
        status: 'sent',
        observacoes: demoNotes
      }])
      .select('id')
      .single();

    if (error) {
      setMessage({ text: 'Erro ao criar proposta demo: ' + error.message, type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    const { error: itemsError } = await supabase.from('proposal_items').insert([
      {
        proposal_id: proposal.id,
        description: 'Briefing, levantamento de necessidades e estudo preliminar',
        unit: 'etapa',
        quantity: 1,
        unit_price: 4500,
        category: 'service'
      },
      {
        proposal_id: proposal.id,
        description: 'Projeto executivo de interiores com detalhamentos técnicos',
        unit: 'etapa',
        quantity: 1,
        unit_price: 14500,
        category: 'service'
      },
      {
        proposal_id: proposal.id,
        description: 'Compatibilização, memorial descritivo e apoio à contratação',
        unit: 'etapa',
        quantity: 1,
        unit_price: 6500,
        category: 'service'
      },
      {
        proposal_id: proposal.id,
        description: 'Acompanhamento técnico inicial da obra',
        unit: 'visita',
        quantity: 3,
        unit_price: 1000,
        category: 'service'
      }
    ]);

    if (itemsError) {
      setMessage({ text: 'Proposta demo criada, mas houve erro nos itens: ' + itemsError.message, type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    await recordProposalEvent(
      proposal.id,
      'demo_created',
      'Proposta demo criada',
      'Registro demonstrativo criado para apresentacao.',
      { proposalNumber: demoNumber },
      'system'
    );

    await fetchProposals();
    setMessage({ text: 'Proposta demo criada. Clique no card para visualizar o PDF apresentável.', type: 'success' });
    setTimeout(() => setMessage(null), 4500);
  };

  const handleClearDemoProposals = async () => {
    if (!user?.id) return;

    const { data: demoProposals, error } = await supabase
      .from('proposals')
      .select('id, proposal_number')
      .eq('user_id', user.id)
      .like('proposal_number', 'DEMO-%');

    if (error) {
      setMessage({ text: 'Erro ao buscar demos: ' + error.message, type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    const ids = (demoProposals || []).map((proposal: any) => proposal.id);
    if (!ids.length) {
      setMessage({ text: 'Nenhuma proposta demo para remover.', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    await supabase.from('proposal_items').delete().in('proposal_id', ids);
    const { error: deleteError } = await supabase.from('proposals').delete().in('id', ids);

    if (deleteError) {
      setMessage({ text: 'Erro ao limpar demos: ' + deleteError.message, type: 'error' });
      setTimeout(() => setMessage(null), 4500);
      return;
    }

    await fetchProposals();
    setMessage({ text: `${ids.length} proposta(s) demo removida(s).`, type: 'success' });
    setTimeout(() => setMessage(null), 3500);
  };

  const filteredProposals = proposals.filter(p =>
    p.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projetoNome.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedProposal = selectedProposalId
    ? proposals.find((proposal) => proposal.id === selectedProposalId) || null
    : null;
  const selectedProposalSubtotal = selectedProposal
    ? selectedProposal.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
    : 0;
  const detailTabs: { id: typeof detailsTab; label: string }[] = [
    { id: 'summary', label: 'Resumo' },
    { id: 'items', label: 'Itens' },
    { id: 'history', label: 'Histórico' },
    { id: 'contracts', label: 'Contrato' },
    { id: 'actions', label: 'Ações' }
  ];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Propostas Comerciais</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Orçamentos detalhados vinculados a cada frente de trabalho.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateDemoProposal}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Demo</span>
          </button>
          <button
            onClick={handleClearDemoProposals}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-white dark:bg-gray-900 text-rose-500 border border-rose-100 dark:border-rose-900/40 rounded-2xl font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all active:scale-95"
          >
            <Trash2 size={18} />
            <span>Limpar demos</span>
          </button>
          <button
            onClick={handleOpenNewProposal}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Nova Proposta</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente ou obra..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-500/10 text-gray-900 dark:text-white font-bold shadow-sm"
        />
      </div>

      {message && (
        <div className={`p-4 rounded-2xl font-bold text-sm flex items-center gap-3 ${message.type === 'success'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
          : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
          }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProposals.map((p) => (
          <div
            key={p.id}
            onClick={() => {
              setSelectedProposalId(p.id);
              setDetailsTab('summary');
            }}
            className="group bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-teal-400 transition-all relative cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                {{
                  'approved': 'Aprovado',
                  'draft': 'Rascunho',
                  'sent': 'Enviado',
                  'rejected': 'Rejeitado'
                }[p.status] || p.status}
              </span>
              <p className="text-[10px] font-bold text-gray-400 tabular-nums">#{p.proposalNumber}</p>
            </div>

            <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-teal-600 transition-colors">{p.client}</h3>
            <div className="flex items-center gap-2 mb-8">
              <Hammer size={12} className="text-teal-600" />
              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{p.projetoNome}</p>
            </div>
            {p.acceptedAt && (
              <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                <p className="text-[9px] font-black uppercase tracking-widest">Aceite registrado</p>
                <p className="mt-1 text-xs font-bold">{formatDateTime(p.acceptedAt)}</p>
              </div>
            )}
            <div className="mb-6 rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/70">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 size={14} className="text-teal-500" />
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Histórico comercial</p>
              </div>
              <div className="space-y-3">
                {getProposalTimeline(p).map((event) => (
                  <div key={event.id} className="grid grid-cols-[10px_1fr] gap-3">
                    <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                      event.actorType === 'client'
                        ? 'bg-emerald-400'
                        : event.actorType === 'user'
                          ? 'bg-teal-400'
                          : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white">{event.title}</p>
                      <p className="text-[10px] font-bold text-gray-400">
                        {formatTimelineDate(event.createdAt)}
                        {event.details ? ` - ${event.details}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor da Proposta</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">R$ {p.total.toLocaleString('pt-BR')}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProposalId(p.id);
                  setDetailsTab('summary');
                }}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
              <button
                onClick={(e) => handleSendProposalWhatsapp(p, e)}
                className="py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-600 hover:text-white flex items-center justify-center gap-2"
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
              <button
                onClick={(e) => handleCopyProposalSummary(p, e)}
                className="py-3 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-gray-900 flex items-center justify-center gap-2"
              >
                <Clipboard size={15} /> Copiar
              </button>
              <button
                onClick={(e) => handleCopyPublicProposalLink(p, e)}
                className="py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-teal-600 hover:text-white flex items-center justify-center gap-2"
              >
                <Link2 size={15} /> Link Cliente
              </button>
            </div>
            <button
              onClick={(e) => handleViewContract(p, e)}
              className="mt-2 w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-90 flex items-center justify-center gap-2"
            >
              <FileSignature size={16} /> Contrato / Aceite
            </button>
            {p.status !== 'approved' && (
              <button
                onClick={(e) => handleRegisterAcceptance(p, e)}
                className="mt-2 w-full py-3 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-teal-600 hover:text-white flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} /> Registrar Aceite
              </button>
            )}
            <button
              onClick={(e) => handleApproveAndCreateProject(p, e)}
              className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> {p.status === 'approved' ? 'Abrir Obra' : 'Aceite e Virar Obra'}
            </button>
          </div>
        ))}
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 shrink-0 relative">
              <div className="pr-14">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedProposal.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                    {{
                      approved: 'Aprovada',
                      draft: 'Rascunho',
                      sent: 'Enviada',
                      rejected: 'Rejeitada'
                    }[selectedProposal.status] || selectedProposal.status}
                  </span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">#{selectedProposal.proposalNumber}</p>
                </div>
                <h2 className="mt-3 text-2xl md:text-3xl font-black text-gray-900 dark:text-white">{selectedProposal.client}</h2>
                <p className="mt-1 text-sm font-bold text-teal-600 dark:text-teal-400">{selectedProposal.projetoNome}</p>
              </div>
              <button
                onClick={() => setSelectedProposalId(null)}
                className="absolute right-6 top-6 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-500 dark:text-gray-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="px-6 md:px-8 pt-5 shrink-0">
              <div className="flex flex-wrap gap-2 rounded-3xl bg-gray-100 p-2 dark:bg-gray-900">
                {detailTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDetailsTab(tab.id)}
                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      detailsTab === tab.id
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                        : 'text-gray-500 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              {detailsTab === 'summary' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-6">
                    <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Resumo comercial</p>
                      <h3 className="mt-3 text-xl font-black text-gray-900 dark:text-white">{selectedProposal.client}</h3>
                      <p className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Proposta emitida em {formatDate(selectedProposal.proposalDate)} para {selectedProposal.projetoNome || 'Geral'}.</p>
                      {selectedProposal.notes && (
                        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-gray-600 dark:text-gray-300">{selectedProposal.notes}</p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[28px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pagamento</p>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{selectedProposal.paymentTerms || 'A combinar.'}</p>
                      </div>
                      <div className="rounded-[28px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Prazos</p>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">{selectedProposal.deliveryTerms || 'Prazos a confirmar.'}</p>
                      </div>
                    </div>
                  </div>

                  <aside className="rounded-[32px] border border-teal-100 bg-teal-50 p-6 dark:border-teal-900/50 dark:bg-teal-950/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-300">Valor total</p>
                    <p className="mt-3 text-3xl font-black text-gray-900 dark:text-white">{formatCurrency(selectedProposal.total)}</p>
                    <div className="mt-6 space-y-3 text-sm font-bold text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between gap-4">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selectedProposalSubtotal)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Itens</span>
                        <span>{selectedProposal.items.length}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Validade</span>
                        <span>{selectedProposal.validityDays || 15} dias</span>
                      </div>
                    </div>
                    {selectedProposal.acceptedAt && (
                      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <p className="text-[10px] font-black uppercase tracking-widest">Aceite registrado</p>
                        <p className="mt-1 text-sm font-bold">{formatDateTime(selectedProposal.acceptedAt)}</p>
                      </div>
                    )}
                  </aside>
                </div>
              )}

              {detailsTab === 'items' && (
                <div className="space-y-4">
                  {selectedProposal.items.map((item) => (
                    <div key={item.id} className="grid gap-4 rounded-[28px] border border-gray-100 bg-gray-50 p-5 md:grid-cols-[1fr_90px_120px_140px] dark:border-gray-800 dark:bg-gray-900">
                      <div>
                        <p className="font-black text-gray-900 dark:text-white">{item.description}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">{item.category === 'service' ? 'Serviço' : 'Produto'} - {item.unit}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Qtd.</p>
                        <p className="mt-1 font-black text-gray-900 dark:text-white">{item.quantity.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unitário</p>
                        <p className="mt-1 font-black text-gray-900 dark:text-white">{formatCurrency(item.unitPrice)}</p>
                      </div>
                      <div className="md:text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total</p>
                        <p className="mt-1 font-black text-teal-600 dark:text-teal-400">{formatCurrency(item.quantity * item.unitPrice)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end rounded-[28px] bg-gray-900 p-5 text-white dark:bg-white dark:text-gray-950">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total da proposta</p>
                      <p className="mt-1 text-2xl font-black">{formatCurrency(selectedProposal.total)}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailsTab === 'history' && (
                <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 flex items-center gap-2">
                    <Clock3 size={18} className="text-teal-500" />
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Histórico comercial</h3>
                  </div>
                  <div className="space-y-5">
                    {getProposalTimeline(selectedProposal).map((event) => (
                      <div key={event.id} className="grid grid-cols-[14px_1fr] gap-4">
                        <span className={`mt-1.5 h-3 w-3 rounded-full ${
                          event.actorType === 'client'
                            ? 'bg-emerald-400'
                            : event.actorType === 'user'
                              ? 'bg-teal-400'
                              : 'bg-gray-400'
                        }`} />
                        <div className="border-b border-gray-200 pb-5 last:border-b-0 dark:border-gray-800">
                          <p className="font-black text-gray-900 dark:text-white">{event.title}</p>
                          <p className="mt-1 text-xs font-bold text-gray-400">{formatDateTime(event.createdAt)}{event.details ? ` - ${event.details}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailsTab === 'contracts' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-[32px] border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Dossiê da proposta</p>
                        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">Contrato assinado</h3>
                        <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Anexe o PDF ou imagem do contrato/termo assinado pelo cliente.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white transition hover:bg-teal-700">
                        <Upload size={17} />
                        {uploadingContractId === selectedProposal.id ? 'Enviando...' : 'Anexar'}
                        <input
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={uploadingContractId === selectedProposal.id}
                          onChange={(e) => handleSignedContractUpload(selectedProposal, e)}
                        />
                      </label>
                    </div>

                    <div className="mt-6 space-y-3">
                      {(selectedProposal.contracts || []).length ? (
                        selectedProposal.contracts?.map((contract) => (
                          <div key={contract.id} className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
                            <div className="min-w-0">
                              <p className="truncate font-black text-gray-900 dark:text-white">{contract.fileName}</p>
                              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {formatFileSize(contract.fileSize)} - {formatDateTime(contract.uploadedAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenSignedContract(contract)}
                              className="rounded-2xl bg-gray-900 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950"
                            >
                              Abrir arquivo
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-950">
                          <FileSignature size={34} className="mx-auto text-gray-300" />
                          <p className="mt-4 font-black text-gray-900 dark:text-white">Nenhum contrato assinado anexado</p>
                          <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">Use o botão Anexar para guardar o documento final da negociação.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="rounded-[32px] border border-emerald-100 bg-emerald-50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Status documental</p>
                    <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
                      {(selectedProposal.contracts || []).length ? 'Contrato arquivado' : 'Pendente'}
                    </p>
                    <p className="mt-3 text-sm font-semibold leading-6 text-gray-600 dark:text-gray-300">
                      O arquivo fica em bucket privado no Supabase e só usuários autorizados do escritório conseguem abrir por link temporário.
                    </p>
                    <button
                      onClick={() => handleViewContract(selectedProposal)}
                      className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition hover:bg-emerald-100 dark:bg-gray-950 dark:text-emerald-300 dark:hover:bg-gray-900"
                    >
                      Gerar termo de aceite
                    </button>
                  </aside>
                </div>
              )}

              {detailsTab === 'actions' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <button onClick={() => handleViewProposal(selectedProposal)} className="rounded-[28px] bg-gray-900 p-5 text-left text-white transition hover:opacity-90 dark:bg-white dark:text-gray-950">
                    <p className="font-black">Abrir PDF da proposta</p>
                    <p className="mt-1 text-sm opacity-70">Visualizar, imprimir ou salvar em PDF.</p>
                  </button>
                  <button onClick={() => handleViewContract(selectedProposal)} className="rounded-[28px] bg-slate-100 p-5 text-left text-slate-900 transition hover:bg-slate-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800">
                    <p className="font-black">Contrato / aceite</p>
                    <p className="mt-1 text-sm opacity-70">Gerar termo de aceite para assinatura.</p>
                  </button>
                  <button onClick={() => handleCopyPublicProposalLink(selectedProposal)} className="rounded-[28px] bg-teal-50 p-5 text-left text-teal-700 transition hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-300">
                    <p className="font-black">Copiar link do cliente</p>
                    <p className="mt-1 text-sm opacity-70">Enviar portal público para aprovação online.</p>
                  </button>
                  <button onClick={() => handleSendProposalWhatsapp(selectedProposal)} className="rounded-[28px] bg-emerald-50 p-5 text-left text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <p className="font-black">Enviar por WhatsApp</p>
                    <p className="mt-1 text-sm opacity-70">Abrir mensagem pronta para o cliente.</p>
                  </button>
                  <button onClick={() => handleCopyProposalSummary(selectedProposal)} className="rounded-[28px] bg-gray-100 p-5 text-left text-gray-700 transition hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
                    <p className="font-black">Copiar resumo</p>
                    <p className="mt-1 text-sm opacity-70">Resumo curto para e-mail ou conversa.</p>
                  </button>
                  {selectedProposal.status !== 'approved' && (
                    <button onClick={() => handleRegisterAcceptance(selectedProposal)} className="rounded-[28px] bg-teal-600 p-5 text-left text-white transition hover:bg-teal-700">
                      <p className="font-black">Registrar aceite interno</p>
                      <p className="mt-1 text-sm opacity-80">Marcar proposta como aprovada.</p>
                    </button>
                  )}
                  <button onClick={() => handleApproveAndCreateProject(selectedProposal)} className="rounded-[28px] bg-emerald-600 p-5 text-left text-white transition hover:bg-emerald-700 md:col-span-2">
                    <p className="font-black">{selectedProposal.status === 'approved' ? 'Abrir obras' : 'Aceite e virar obra'}</p>
                    <p className="mt-1 text-sm opacity-80">Converter a proposta aprovada em obra/projeto ativo.</p>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 shrink-0 relative">
              <div className="pr-16">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Nova Proposta Comercial</h2>
                <div className="mt-4 w-full">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Modelo rápido de proposta</label>
                  <select
                    value={formData.templateId || ''}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="mt-2 w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-teal-200 dark:border-teal-700 rounded-2xl font-black text-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500"
                  >
                    <option value="" className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">Escolha um modelo para preencher automaticamente</option>
                    {proposalTemplates.map((template) => (
                      <option key={template.id} value={template.id} className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">{template.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="absolute right-8 top-8 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <form id="proposal-form" onSubmit={handleSaveProposal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">1. Vincular à Obra / Projeto</label>
                  <select value={formData.projetoId} onChange={(e) => setFormData({ ...formData, projetoId: e.target.value })} className="w-full px-5 py-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl font-black text-teal-600 dark:text-teal-400 outline-none">
                    <option value="">Geral / Sem vínculo</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">2. Cliente / Lead</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => {
                      const selectedClient = clients.find((client) => client.id === e.target.value);
                      setFormData({
                        ...formData,
                        clientId: selectedClient?.id || '',
                        client: selectedClient?.nome || '',
                        items: selectedClient ? getDefaultItemFromClient(selectedClient) : formData.items
                      });
                    }}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold"
                  >
                    <option value="">Selecionar cliente cadastrado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Proposta</label>
                    <input type="text" required value={formData.proposalNumber} onChange={(e) => setFormData({ ...formData, proposalNumber: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" placeholder="2024/005" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</label>
                    <input type="text" required value={formData.client} onChange={(e) => setFormData({ ...formData, client: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                    <input type="date" required value={formData.proposalDate} onChange={(e) => setFormData({ ...formData, proposalDate: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold">
                      <option value="draft">Rascunho</option>
                      <option value="sent">Enviada</option>
                      <option value="approved">Aprovada</option>
                      <option value="rejected">Rejeitada</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Modelos detalhados</label>
                    <p className="text-xs text-gray-400 font-bold mt-1">Você também pode escolher pelos cards abaixo para preencher escopo, condições e premissas automaticamente.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {proposalTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleApplyTemplate(template.id)}
                        className={`p-4 rounded-2xl border text-left transition-all ${formData.templateId === template.id
                          ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-500 shadow-md'
                          : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-teal-300'
                          }`}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{template.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-2">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens da Proposta</label>
                    <button type="button" onClick={handleAddItem} className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      + Item
                    </button>
                  </div>
                  {formData.items.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                        className="md:col-span-6 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl font-bold"
                        placeholder="Descrição do serviço"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                        className="md:col-span-2 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl font-bold"
                        placeholder="Qtd."
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="md:col-span-3 px-4 py-3 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl font-bold"
                        placeholder="Valor unit."
                      />
                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="md:col-span-1 p-3 text-gray-300 hover:text-rose-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none h-28"
                    placeholder="Condições comerciais, escopo, próximos passos..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condições de Pagamento</label>
                    <textarea
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none h-28"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prazos e Premissas</label>
                    <textarea
                      value={formData.deliveryTerms}
                      onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold resize-none h-28"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Validade da Proposta (dias)</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: Number(e.target.value) || 15 })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold"
                  />
                </div>

                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-800 flex items-center justify-between gap-6">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    Ao aprovar, a proposta pode virar obra com orçamento inicial já preenchido.
                  </p>
                  <span className="text-2xl font-black text-blue-700 dark:text-blue-300 whitespace-nowrap">
                    R$ {formData.items.reduce((acc: number, item: any) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </form>
            </div>
            <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex gap-4 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-[40px]">
              <button onClick={() => setShowFormModal(false)} className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-[10px] border border-gray-100 dark:border-gray-700">Cancelar</button>
              <button form="proposal-form" type="submit" className="flex-1 py-4 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                Salvar Proposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalsPage;
