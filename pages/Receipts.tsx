
import {
  CheckCircle2,
  DollarSign,
  FileText,
  Hammer,
  Plus,
  Printer,
  Search,
  Trash2,
  User,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { criarRecibo, formatarData, formatarMoeda, gerarHTMLRecibo } from '../services/reciboService';
import { ParametrosGeracaoRecibo, Recibo } from '../types/recibo';

const ReceiptsPage: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Recibo[]>([]);
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReceipts();
      fetchProjects();
    }
  }, [user]);

  const fetchReceipts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        projects (name)
      `)
      .order('data_emissao', { ascending: false });

    if (error) {
      console.error('Error fetching receipts:', error);
    } else {
      setReceipts((data || []).map(r => ({
        id: r.id,
        numero: r.numero,
        prestadorNome: r.emissor_nome,
        prestadorCpfCnpj: r.emissor_documento || '',
        clienteNome: r.cliente_nome,
        clienteCpfCnpj: r.cliente_documento || '',
        descricaoServico: r.descricao || '',
        valor: Number(r.valor),
        moeda: r.moeda || 'BRL',
        dataEmissao: r.data_emissao,
        formaRecebimento: r.forma_pagamento || '',
        projetoNome: r.projects?.name || 'Geral',
        status: 'valido',
        assinaturaPrestador: r.metadata?.assinatura
      })));
    }
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    if (data) setProjects(data);
  };

  const [formData, setFormData] = useState<ParametrosGeracaoRecibo & { projetoId?: string }>({
    prestadorNome: '',
    prestadorCpfCnpj: '',
    prestadorEndereco: '',
    clienteNome: '',
    clienteCpfCnpj: '',
    descricaoServico: '',
    valor: 0,
    dataServicoInicio: new Date().toISOString().split('T')[0],
    dataServicoFim: new Date().toISOString().split('T')[0],
    formaRecebimento: 'Transferência Bancária / PIX',
    projetoNome: 'Geral',
    projetoId: ''
  });

  const handlePrint = (recibo: Recibo) => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>Recibo ${recibo.numero}</title></head><body>${gerarHTMLRecibo(recibo)}<script>window.print();</script></body></html>`);
      win.document.close();
    }
  };

  const handleSaveNewReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    let tempRecibo = criarRecibo(formData);
    const assinaturaSimulada = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    const payload = {
      user_id: user?.id,
      project_id: formData.projetoId || null,
      numero: tempRecibo.numero,
      emissor_nome: formData.prestadorNome,
      emissor_documento: formData.prestadorCpfCnpj,
      cliente_nome: formData.clienteNome,
      cliente_documento: formData.clienteCpfCnpj,
      valor: formData.valor,
      descricao: formData.descricaoServico,
      forma_pagamento: formData.formaRecebimento,
      data_emissao: new Date().toISOString().split('T')[0],
      metadata: {
        assinatura: assinaturaSimulada,
        dataServicoInicio: formData.dataServicoInicio,
        dataServicoFim: formData.dataServicoFim
      }
    };

    const { error } = await supabase.from('receipts').insert([payload]);

    if (error) {
      alert('Erro ao salvar recibo: ' + error.message);
    } else {
      await fetchReceipts();
      setShowCreateModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      prestadorNome: '',
      prestadorCpfCnpj: '',
      prestadorEndereco: '',
      clienteNome: '',
      clienteCpfCnpj: '',
      descricaoServico: '',
      valor: 0,
      dataServicoInicio: new Date().toISOString().split('T')[0],
      dataServicoFim: new Date().toISOString().split('T')[0],
      formaRecebimento: 'Transferência Bancária / PIX',
      projetoNome: 'Apartamento Granja Viana'
    });
  };

  const filtered = receipts.filter(r =>
    r.clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.numero.includes(searchTerm) ||
    r.projetoNome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão de Recibos Digitais</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Controle de quitações organizadas por projeto/obra.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all hover:bg-indigo-700"
        >
          <Plus size={20} /> Novo Recibo Avulso
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por cliente, obra ou número do recibo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-gray-900 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-800">
          <FileText size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Nenhum recibo emitido ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div key={r.id} className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group relative">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                  {r.projetoNome || 'Geral'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 tabular-nums">{formatarData(r.dataEmissao)}</span>
              </div>
              <h3 className="font-black text-gray-900 dark:text-white mb-1 truncate">{r.clienteNome}</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-4">Emissor: {r.prestadorNome}</p>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl mb-6">
                <p className="text-xs font-medium text-gray-500 line-clamp-2 italic">"{r.descricaoServico}"</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                <p className="text-lg font-black text-indigo-600">{formatarMoeda(r.valor, r.moeda)}</p>
                <div className="flex gap-2">
                  <button onClick={() => handlePrint(r)} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-gray-400 hover:text-indigo-600 transition-all"><Printer size={18} /></button>
                  <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-gray-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Recibo - Com Vínculo de Obra */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Emitir Recibo por Obra</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Documento vinculado ao histórico do projeto</p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <form id="receipt-form" onSubmit={handleSaveNewReceipt} className="space-y-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-indigo-50 pb-2 flex items-center gap-2">
                    <Hammer size={14} /> 1. Vincular à Obra / Projeto
                  </h3>
                  <select required value={formData.projetoId} onChange={(e) => setFormData({ ...formData, projetoId: e.target.value })} className="w-full px-5 py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl font-black text-indigo-600 dark:text-indigo-400 outline-none">
                    <option value="">Geral / Administrativo</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 flex items-center gap-2">
                    <User size={14} /> 2. Dados do Prestador e Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Nome do Prestador (Quem recebe)</label>
                      <input required type="text" value={formData.prestadorNome} onChange={(e) => setFormData({ ...formData, prestadorNome: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Nome do Cliente (Quem paga)</label>
                      <input required type="text" value={formData.clienteNome} onChange={(e) => setFormData({ ...formData, clienteNome: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 pb-2 flex items-center gap-2">
                    <DollarSign size={14} /> 3. Valores e Descritivo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Valor Total (R$)</label>
                      <input required type="number" step="0.01" value={formData.valor || ''} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-black text-indigo-600 text-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Forma</label>
                      <select value={formData.formaRecebimento} onChange={(e) => setFormData({ ...formData, formaRecebimento: e.target.value })} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-sm">
                        <option>Transferência Bancária / PIX</option>
                        <option>Dinheiro em Espécie</option>
                        <option>Cartão de Crédito</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Serviço/Item Quitado</label>
                    <textarea required value={formData.descricaoServico} onChange={(e) => setFormData({ ...formData, descricaoServico: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[28px] font-bold text-sm resize-none h-28" placeholder="Ex: Pagamento referente a 2ª etapa de instalação elétrica..." />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex gap-4 shrink-0 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-[40px]">
              <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all uppercase tracking-widest text-[10px] border border-gray-100 dark:border-gray-700">Descartar</button>
              <button form="receipt-form" type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
                <CheckCircle2 size={18} /> Confirmar e Gerar Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptsPage;
