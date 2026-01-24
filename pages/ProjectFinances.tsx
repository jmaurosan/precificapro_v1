
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, ArrowLeft, DollarSign, Calendar, MapPin, 
  Trash2, Search, X, CheckCircle2, ShoppingCart, 
  Camera, FileText, AlertTriangle, Receipt, Hash,
  ChevronDown, ArrowUpCircle, ArrowDownCircle, Filter, FilterX,
  Printer
} from 'lucide-react';
import { Project, ProjectExpense } from '../types';
import { criarRecibo, gerarHTMLRecibo } from '../services/reciboService';

const ProjectFinances: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Dados Simulados do Projeto Selecionado
  const [project, setProject] = useState<Project>({
    id: id || 'p1',
    name: 'Apartamento Granja Viana',
    clientId: 'c1',
    clientName: 'Mauro Silva',
    totalBudget: 45000,
    spentAmount: 12450.00,
    startDate: '2024-03-15',
    status: 'active'
  });

  const [expenses, setExpenses] = useState<ProjectExpense[]>([
    {
      id: 'exp1',
      projectId: 'p1',
      description: 'Cimento e Areia (Material de Construção)',
      location: 'Leroy Merlin',
      quantity: 10,
      unitValue: 35.00,
      totalValue: 350.00,
      date: '2024-05-20',
      type: 'expense'
    }
  ]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<ProjectExpense>>({
    description: '',
    location: '',
    quantity: 1,
    unitValue: 0,
    date: new Date().toISOString().split('T')[0],
    type: 'expense'
  });

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + e.totalValue, 0), [expenses]);
  const balance = project.totalBudget - totalSpent;
  const balancePercent = (balance / project.totalBudget) * 100;

  const handleGenerateRecibo = (expense: ProjectExpense) => {
    // Cria um recibo técnico baseado na despesa
    const recibo = criarRecibo({
      prestadorNome: expense.location,
      prestadorCpfCnpj: '00.000.000/0000-00', // Placeholder
      clienteNome: project.clientName,
      clienteCpfCnpj: '000.000.000-00', // Placeholder
      projetoNome: project.name,
      dataServicoInicio: expense.date,
      dataServicoFim: expense.date,
      descricaoServico: expense.description,
      valor: expense.totalValue
    });

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<html><head><title>Recibo Digital - PrecificaPro</title></head><body>${gerarHTMLRecibo(recibo)}<script>window.print();</script></body></html>`);
      win.document.close();
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const totalValue = (formData.quantity || 0) * (formData.unitValue || 0);
    const newExpense: ProjectExpense = {
      id: `exp-${Date.now()}`,
      projectId: project.id,
      description: formData.description || '',
      location: formData.location || '',
      quantity: formData.quantity || 1,
      unitValue: formData.unitValue || 0,
      totalValue: totalValue,
      date: formData.date || '',
      type: formData.type as 'expense' | 'return',
      receiptImage: receiptPreview || undefined
    };
    setExpenses([newExpense, ...expenses]);
    setShowFormModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ description: '', location: '', quantity: 1, unitValue: 0, date: new Date().toISOString().split('T')[0], type: 'expense' });
    setReceiptPreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest mb-2">
            <ArrowLeft size={16} /> Voltar para Projetos
          </button>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">Gestão Financeira: {project.name}</h1>
        </div>
        <button onClick={() => setShowFormModal(true)} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
          <Plus size={20} /> Lançar Nova Despesa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Budget Total da Obra</p>
          <p className="text-3xl font-black text-gray-900 dark:text-white">R$ {project.totalBudget.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Gasto</p>
          <p className="text-3xl font-black text-rose-600">R$ {totalSpent.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo</p>
          <p className={`text-3xl font-black ${balance < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>R$ {balance.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <h2 className="text-xl font-black text-gray-900 dark:text-white">Extrato de Lançamentos</h2>
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Filtrar lançamentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs font-bold outline-none" />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Total</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all group">
                  <td className="px-8 py-6 text-xs font-black text-gray-500">{new Date(expense.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-tight">{expense.description}</p>
                    <p className="text-[10px] font-bold text-emerald-600">{expense.location}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-sm">R$ {expense.totalValue.toLocaleString('pt-BR')}</td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <button onClick={() => handleGenerateRecibo(expense)} title="Gerar Recibo Digital" className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                          <Printer size={16} />
                       </button>
                       {expense.receiptImage && (
                         <button className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl"><Receipt size={16} /></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 my-8">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">Lançar Despesa</h2>
              <button onClick={() => { setShowFormModal(false); resetForm(); }} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleAddExpense} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                <input required type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</label>
                    <input required type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade</label>
                    <input required type="number" min="1" step="0.01" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-center" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unitário (R$)</label>
                    <input required type="number" step="0.01" value={formData.unitValue} onChange={(e) => setFormData({...formData, unitValue: parseFloat(e.target.value) || 0})} className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-center" />
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowFormModal(false); resetForm(); }} className="flex-1 px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest text-[10px]">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-widest text-[10px]">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFinances;
