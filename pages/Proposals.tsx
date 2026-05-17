
import {
  ChevronRight,
  Hammer,
  Plus, Search,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

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
  proposalNumber: string;
  proposalDate: string;
  client: string;
  company: string;
  projetoNome: string;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: string;
  itemsCount: number;
  items: ProposalItem[];
  notes?: string;
}

const ProposalsPage: React.FC = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProposals();
      fetchProjects();
    }
  }, [user]);

  const fetchProposals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        projects (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
    } else {
      setProposals((data || []).map(p => ({
        id: p.id,
        proposalNumber: p.proposal_number,
        proposalDate: p.proposal_date,
        client: p.client_name,
        company: user?.company || 'Individual',
        projetoNome: p.projects?.name || 'Geral',
        total: Number(p.total_amount),
        status: p.status as any,
        createdAt: p.created_at,
        itemsCount: p.items?.length || 0,
        items: p.items || []
      })));
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    if (data) setProjects(data);
  };


  const [formData, setFormData] = useState<any>({
    proposalNumber: '',
    proposalDate: new Date().toISOString().split('T')[0],
    client: '',
    projetoId: '',
    status: 'draft',
    items: []
  });

  // Função para abrir o visualizador de proposta digital
  const handleViewProposal = (proposal: Proposal) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Proposta Comercial - ${proposal.proposalNumber}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              .header { border-bottom: 2px solid #3b66f5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
              .details { margin-bottom: 40px; line-height: 1.6; }
              .item-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .item-table th { background: #f5f7ff; text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; }
              .item-table td { padding: 12px; border-bottom: 1px solid #eee; }
              .total { text-align: right; margin-top: 30px; font-size: 20px; font-weight: bold; color: #3b66f5; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            <div class="no-print" style="background: #f5f7ff; padding: 10px; margin-bottom: 20px; border-radius: 8px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #3b66f5; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Imprimir Proposta / PDF</button>
            </div>
            <div class="header">
              <div>
                <h1 style="margin:0; color:#3b66f5;">PROPOSTA COMERCIAL</h1>
                <p>Nº ${proposal.proposalNumber}</p>
              </div>
              <div style="text-align:right">
                <p><strong>Emissão:</strong> ${new Date(proposal.proposalDate).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div class="details">
              <p><strong>Cliente:</strong> ${proposal.client}</p>
              <p><strong>Projeto Relacionado:</strong> ${proposal.projetoNome}</p>
            </div>
            <table class="item-table">
              <thead>
                <tr>
                  <th>Descrição do Serviço / Equipamento</th>
                  <th>Quant.</th>
                  <th>Unitário</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${proposal.items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>R$ ${item.unitPrice.toLocaleString('pt-BR')}</td>
                    <td>R$ ${(item.quantity * item.unitPrice).toLocaleString('pt-BR')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">Total da Proposta: R$ ${proposal.total.toLocaleString('pt-BR')}</div>
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = formData.items.reduce((acc: number, item: any) => acc + (item.quantity * item.unitPrice), 0);

    const payload = {
      user_id: user?.id,
      project_id: formData.projetoId || null,
      proposal_number: formData.proposalNumber,
      proposal_date: formData.proposalDate,
      client_name: formData.client,
      total_amount: total,
      status: formData.status,
      items: formData.items
    };

    const { error } = await supabase.from('proposals').insert([payload]);

    if (error) {
      alert('Erro ao salvar proposta: ' + error.message);
    } else {
      await fetchProposals();
      setShowFormModal(false);
    }
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
        <button
          onClick={() => setShowFormModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Nova Proposta</span>
        </button>
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
          </div>
        ))}
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between shrink-0">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Nova Proposta Comercial</h2>
              <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <form id="proposal-form" onSubmit={handleSaveProposal} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest">1. Vincular à Obra / Projeto</label>
                  <select required value={formData.projetoId} onChange={(e) => setFormData({ ...formData, projetoId: e.target.value })} className="w-full px-5 py-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl font-black text-teal-600 dark:text-teal-400 outline-none">
                    <option value="">Geral / Sem vínculo</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
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
                <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-800">
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300 italic text-center">
                    Ao aprovar esta proposta, o valor total será somado ao orçamento disponível da obra vinculada.
                  </p>
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
