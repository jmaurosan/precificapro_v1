
import {
  ChevronRight,
  CheckCircle2,
  Clipboard,
  Hammer,
  MessageCircle,
  Plus,
  Search,
  Trash2,
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
      setProposals((data || []).map(p => ({
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
      })));
    }
    setLoading(false);
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
        validityDays: 15
      };
    }

    try {
      const parsed = JSON.parse(rawNotes);
      return {
        notes: parsed.notes || '',
        paymentTerms: parsed.paymentTerms || '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
        deliveryTerms: parsed.deliveryTerms || 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
        validityDays: Number(parsed.validityDays || 15)
      };
    } catch {
      return {
        notes: rawNotes,
        paymentTerms: '40% na aprovação da proposta, 40% no desenvolvimento e 20% na entrega final.',
        deliveryTerms: 'Prazos detalhados serão confirmados após alinhamento técnico, aprovação do escopo e disponibilidade das informações do cliente.',
        validityDays: 15
      };
    }
  };

  const buildProposalNotes = () => JSON.stringify({
    notes: formData.notes || '',
    paymentTerms: formData.paymentTerms || '',
    deliveryTerms: formData.deliveryTerms || '',
    validityDays: Number(formData.validityDays || 15),
    isDemo: Boolean(formData.isDemo)
  });

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

  const handleCopyProposalSummary = async (proposal: Proposal, e: React.MouseEvent) => {
    e.stopPropagation();

    const summary = buildShareSummary(proposal);
    try {
      await navigator.clipboard.writeText(summary);
      setMessage({ text: 'Resumo da proposta copiado.', type: 'success' });
    } catch {
      setMessage({ text: 'Não foi possível copiar automaticamente. Abra a proposta e copie manualmente.', type: 'error' });
    }
    setTimeout(() => setMessage(null), 3500);
  };

  const handleSendProposalWhatsapp = (proposal: Proposal, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!proposal.clientPhone) {
      setMessage({ text: 'Este cliente não tem WhatsApp cadastrado. Use Copiar resumo.', type: 'error' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    window.open(createWhatsappLink(proposal.clientPhone, buildShareSummary(proposal)), '_blank');
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

  const handleApproveAndCreateProject = async (proposal: Proposal, e: React.MouseEvent) => {
    e.stopPropagation();

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
      .update({ status: 'approved', project_id: projectId })
      .eq('id', proposal.id);

    if (proposal.clientId) {
      await supabase
        .from('clients')
        .update({ status: 'contratado' })
        .eq('id', proposal.clientId);
    }

    await fetchProposals();
    setMessage({ text: 'Proposta aprovada e obra criada com sucesso.', type: 'success' });
    setTimeout(() => setMessage(null), 3500);
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
            onClick={() => handleViewProposal(p)}
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

            <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-gray-800">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor da Proposta</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">R$ {p.total.toLocaleString('pt-BR')}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleViewProposal(p); }}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
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
            </div>
            <button
              onClick={(e) => handleApproveAndCreateProject(p, e)}
              className="mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> {p.status === 'approved' ? 'Abrir Obra' : 'Aprovar e Virar Obra'}
            </button>
          </div>
        ))}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex-1 pr-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Nova Proposta Comercial</h2>
                <div className="mt-4 max-w-xl">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">Modelo rápido de proposta</label>
                  <select
                    value={formData.templateId || ''}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="mt-2 w-full px-5 py-3.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl font-black text-teal-700 dark:text-teal-300 outline-none"
                  >
                    <option value="">Escolha um modelo para preencher automaticamente</option>
                    {proposalTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
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
