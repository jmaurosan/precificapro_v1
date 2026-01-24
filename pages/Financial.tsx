
import {
  AlertTriangle,
  Box,
  Calendar, CheckCircle2,
  Clock,
  CreditCard,
  Search,
  ShieldCheck,
  Wallet,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { Consignado, ContaPagar } from '../types';

interface ExtendedContaPagar extends ContaPagar {
  parcelaAtual?: number;
  totalParcelas?: number;
  grupoId?: string;
}

const Financial: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'extrato' | 'consignados'>('extrato');
  const [isLoading, setIsLoading] = useState(true);

  const [consignados, setConsignados] = useState<Consignado[]>([]);
  const [payables, setPayables] = useState<ExtendedContaPagar[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchProjects();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        projects (name)
      `)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching financial data:', error);
    } else {
      const expenses = data || [];

      const formattedPayables = expenses
        .filter(e => e.type === 'expense')
        .map(e => ({
          id: e.id,
          descricao: e.description,
          valorTotal: Number(e.total_value),
          dataVencimento: e.date,
          status: e.status || 'aberta',
          categoria: e.categoria || 'material',
          projetoId: e.project_id,
          projetoNome: e.projects?.name || 'Geral',
          prestadorNome: e.location || 'Fornecedor',
          parcelaAtual: e.metadata?.parcelaAtual,
          totalParcelas: e.metadata?.totalParcelas,
          grupoId: e.metadata?.grupoId
        }));

      const formattedConsignados = expenses
        .filter(e => e.type === 'consignado')
        .map(e => ({
          id: e.id,
          projectId: e.project_id,
          fornecedorNome: e.location || 'Fornecedor',
          descricao: e.description,
          quantidade: Number(e.quantity) || 1,
          valorUnitarioEstimado: Number(e.unit_value) || 0,
          dataEntrada: e.date,
          dataPrevisaoDevolucao: e.metadata?.dataPrevisaoDevolucao || '',
          status: e.status === 'paga' ? 'devolvido' : 'pendente'
        }));

      setPayables(formattedPayables);
      setConsignados(formattedConsignados);
    }
    setIsLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    if (data) setProjects(data);
  };

  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ativas' | 'pagas'>('ativas');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [numParcelas, setNumParcelas] = useState(1);
  const [formData, setFormData] = useState<Partial<ExtendedContaPagar>>({
    descricao: '',
    valorTotal: 0,
    dataVencimento: new Date().toISOString().split('T')[0],
    categoria: 'material',
    prestadorNome: '',
    projetoNome: 'Apartamento Granja Viana'
  });

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(payables.map(p => p.projetoNome)));
  }, [payables]);

  const stats = useMemo(() => {
    const aPagar = payables.filter(p => p.status === 'aberta').reduce((acc, curr) => acc + curr.valorTotal, 0);
    const valorConsignado = consignados.filter(c => c.status === 'pendente').reduce((acc, curr) => acc + (curr.valorUnitarioEstimado * curr.quantidade), 0);

    return [
      { label: 'Fluxo de Caixa (A Pagar)', value: `R$ ${aPagar.toLocaleString('pt-BR')}`, icon: Wallet, color: 'emerald' },
      { label: 'Responsabilidade (Consignados)', value: `R$ ${valorConsignado.toLocaleString('pt-BR')}`, icon: ShieldCheck, color: 'amber' },
      { label: 'Itens de Terceiros', value: consignados.filter(c => c.status === 'pendente').length.toString(), icon: Box, color: 'indigo' }
    ];
  }, [payables, consignados]);

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      const matchesStatus = statusFilter === 'ativas' ? p.status !== 'paga' : p.status === 'paga';
      const matchesProject = projectFilter === 'all' || p.projetoNome === projectFilter;
      const matchesSearch = p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prestadorNome.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesProject && matchesSearch;
    }).sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());
  }, [payables, statusFilter, projectFilter, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const grupoId = Math.random().toString(36).substr(2, 9);
    const payloadParcelas = [];
    const valorParcela = (formData.valorTotal || 0) / numParcelas;

    for (let i = 1; i <= numParcelas; i++) {
      const dataBase = new Date(formData.dataVencimento + 'T00:00:00');
      dataBase.setMonth(dataBase.getMonth() + (i - 1));

      payloadParcelas.push({
        project_id: formData.projetoId || null,
        description: formData.descricao || '',
        location: formData.prestadorNome || 'Fornecedor Avulso',
        total_value: valorParcela,
        date: dataBase.toISOString().split('T')[0],
        status: 'aberta',
        categoria: (formData.categoria as any) || 'material',
        type: 'expense',
        user_id: user?.id,
        metadata: {
          parcelaAtual: i,
          totalParcelas: numParcelas,
          grupoId: grupoId
        }
      });
    }

    const { error } = await supabase.from('expenses').insert(payloadParcelas);

    if (error) {
      alert('Erro ao salvar lançamentos: ' + error.message);
    } else {
      await fetchData();
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valorTotal: 0,
      dataVencimento: new Date().toISOString().split('T')[0],
      categoria: 'material',
      prestadorNome: '',
      projetoNome: 'Apartamento Granja Viana'
    });
    setNumParcelas(1);
  };

  const handleTogglePago = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paga' ? 'aberta' : 'paga';
    const { error } = await supabase
      .from('expenses')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    } else {
      setPayables(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão Financeira Global</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Consolidação de pagamentos, parcelamentos e responsabilidade consignada.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView('extrato')} className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeView === 'extrato' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}>Extrato Geral</button>
          <button onClick={() => setActiveView('consignados')} className={`px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'consignados' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'}`}>
            <Box size={14} /> Alerta Consignados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-[32px] p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600 dark:bg-${stat.color}-900/20 dark:text-${stat.color}-400`}>
              <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {activeView === 'extrato' ? (
        <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Fluxo de Lançamentos</h2>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  <button onClick={() => setStatusFilter('ativas')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === 'ativas' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Abertas</button>
                  <button onClick={() => setStatusFilter('pagas')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${statusFilter === 'pagas' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Pagas</button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 max-w-2xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Filtrar por descrição ou fornecedor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-xs font-bold outline-none" />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vencimento</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Obra</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Parcela</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                  <th className="px-8 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredPayables.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white tabular-nums">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(item.dataVencimento).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-indigo-100 dark:border-indigo-800">
                        {item.projetoNome}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-white leading-tight">{item.prestadorNome}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.descricao}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {item.totalParcelas && item.totalParcelas > 1 ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full w-fit border border-gray-200 dark:border-gray-700">
                          <CreditCard size={10} className="text-gray-400" />
                          <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 tabular-nums">{item.parcelaAtual}/{item.totalParcelas}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-300">À VISTA</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right text-sm font-black text-gray-900 dark:text-white tabular-nums">
                      R$ {item.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button
                        onClick={() => handleTogglePago(item.id, item.status)}
                        className={`p-2 rounded-xl transition-all ${item.status === 'paga' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <ShieldCheck className="text-amber-500" /> Itens de Terceiros sob Responsabilidade
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Materiais consignados aguardando devolução ou aceite de compra</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-center gap-3">
              <AlertTriangle className="text-amber-500" size={20} />
              <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase">Risco Patrimonial Monitorado</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Devolução</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Projeto</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</th>
                  <th className="px-8 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Consignado</th>
                  <th className="px-8 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {consignados.map(item => {
                  const isOverdue = new Date(item.dataPrevisaoDevolucao) < new Date();
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 text-sm font-black tabular-nums ${isOverdue ? 'text-rose-500 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                          <Clock size={14} />
                          {new Date(item.dataPrevisaoDevolucao).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {item.projetoNome || 'Geral'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-gray-900 dark:text-white">{item.fornecedorNome}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 dark:text-white">{item.descricao}</span>
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Regime de Teste</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-sm text-amber-600 tabular-nums">
                        R$ {(item.valorUnitarioEstimado * item.quantidade).toLocaleString('pt-BR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Lançamento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Novo Lançamento</h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Vincular à Obra</label>
                  <select
                    value={formData.projetoId || ''}
                    onChange={(e) => setFormData({ ...formData, projetoId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                  >
                    <option value="">Sem vínculo (Geral)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Lançamento</label>
                  <select
                    value={formData.type || 'expense'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                  >
                    <option value="expense">Despesa / Pagamento</option>
                    <option value="consignado">Material Consignado</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                <input required type="text" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vencimento</label>
                  <input type="date" className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" value={formData.dataVencimento} onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parcelas</label>
                  <select className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" value={numParcelas} onChange={(e) => setNumParcelas(parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total</label>
                <input type="number" step="0.01" className="w-full px-6 py-5 bg-emerald-600 text-white rounded-3xl font-black text-2xl shadow-xl shadow-emerald-600/20" value={formData.valorTotal} onChange={(e) => setFormData({ ...formData, valorTotal: parseFloat(e.target.value) || 0 })} />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-[10px]">Confirmar Lançamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financial;
