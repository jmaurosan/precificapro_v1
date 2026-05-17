import {
  Briefcase,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  Hammer,
  PencilRuler,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { PricingConfiguration } from '../types';

interface CalculatorItem {
  id: string;
  description: string;
  quantity: number;
  unitCost: number;
  profitMargin: number;
  type: 'material' | 'service';
}

interface ProjectPhase {
  id: string;
  name: string;
  hours: number;
}

interface CatalogService {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  unit: string;
}

const CalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'project' | 'construction'>('project');

  // States for Construction Calculator
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([]);
  const [items, setItems] = useState<CalculatorItem[]>([]);

  // States for Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [importSearchTerm, setImportSearchTerm] = useState('');

  // States for Project Pricing
  const [projectPhases, setProjectPhases] = useState<ProjectPhase[]>([
    { id: '1', name: 'Levantamento / Briefing', hours: 0 },
    { id: '2', name: 'Estudo Preliminar', hours: 0 },
    { id: '3', name: 'Anteprojeto', hours: 0 },
    { id: '4', name: 'Projeto Executivo', hours: 0 },
    { id: '5', name: 'Detalhamento de Interiores', hours: 0 },
  ]);
  const [projectArea, setProjectArea] = useState<number>(0);
  const [complexity, setComplexity] = useState<number>(1); // 1.0 standard

  const [pricingConfig, setPricingConfig] = useState<PricingConfiguration | null>(null);

  useEffect(() => {
    if (user) {
      fetchPricingConfig();
      fetchCatalogServices();
      fetchProjects();
    }
  }, [user]);

  const fetchPricingConfig = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('pricing_config')
      .eq('id', user?.id)
      .single();

    if (data?.pricing_config) {
      setPricingConfig(data.pricing_config);
    }
  };

  const fetchCatalogServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name');
    if (data) {
      setCatalogServices(data.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        category: s.category || '',
        basePrice: Number(s.base_price),
        unit: s.unit || ''
      })));
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    if (data) setProjects(data);
  };

  // --- Logic for Construction Calculator ---
  const handleSaveToProject = async () => {
    if (!selectedProject) return;

    const valueToSave = activeTab === 'project' ? suggestedProjectPrice : constructionTotal;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ total_budget: valueToSave })
        .eq('id', selectedProject);

      if (error) throw error;

      alert(`Orçamento de R$ ${valueToSave.toLocaleString('pt-BR')} vinculado com sucesso!`);
      setShowSaveModal(false);
      navigate('/projects');
    } catch (error: any) {
      alert('Erro ao vincular orçamento: ' + error.message);
    }
  };

  const getSuggestedMargin = (type: 'material' | 'service') => {
    if (!pricingConfig) return 0;
    const targetMargin = type === 'service' ? pricingConfig.serviceMargin : pricingConfig.materialMargin;

    const fixedCostPercentage = pricingConfig.monthlyRevenue > 0 ? (pricingConfig.fixedCosts / pricingConfig.monthlyRevenue) * 100 : 0;
    const totalDeductions = pricingConfig.taxRate + pricingConfig.variableRate + targetMargin + fixedCostPercentage;
    const divisor = (100 - totalDeductions) / 100;
    return divisor > 0 ? ((1 / divisor) - 1) * 100 : 0;
  };

  const constructionTotal = items.reduce((sum, item) => {
    const cost = item.quantity * item.unitCost;
    return sum + (cost * (1 + item.profitMargin / 100));
  }, 0);

  const addItem = () => setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitCost: 0, profitMargin: 30, type: 'material' }]);
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof CalculatorItem, value: any) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  // --- Logic for Project Pricing ---
  const hourlyRate = pricingConfig && pricingConfig.monthlyHoursCapacity > 0
    ? pricingConfig.fixedCosts / pricingConfig.monthlyHoursCapacity
    : 0;

  const totalProjectHours = projectPhases.reduce((sum, p) => sum + p.hours, 0);
  // Custo Base = Horas * Custo Hora Técnica
  const projectBaseCost = totalProjectHours * hourlyRate;

  // Preço de Venda = Custo Base / (1 - (Impostos + Lucro + Var)/100)
  // Usando a margem de serviço como padrão para projetos intelectuais
  const targetProjectMargin = pricingConfig ? pricingConfig.serviceMargin : 20;
  const projectDeductions = pricingConfig ? (pricingConfig.taxRate + pricingConfig.variableRate + targetProjectMargin) : 30;
  const projectDivisor = (100 - projectDeductions) / 100;

  const suggestedProjectPrice = projectDivisor > 0 ? projectBaseCost / projectDivisor : 0;

  const updatePhase = (id: string, hours: number) => {
    setProjectPhases(projectPhases.map(p => p.id === id ? { ...p, hours } : p));
  };

  const handleImportService = (service: CatalogService) => {
    const newItem: CalculatorItem = {
      id: Date.now().toString(),
      description: service.name,
      quantity: 1,
      unitCost: service.basePrice,
      profitMargin: 30, // Default margin
      type: 'service'
    };
    setItems([...items, newItem]);
    setShowImportModal(false);
  };

  const handleGenerateProposal = () => {
    navigate('/proposal-view', {
      state: {
        items: activeTab === 'construction' ? items : [],
        phases: activeTab === 'project' ? projectPhases : [],
        total: activeTab === 'construction' ? constructionTotal : 0,
        suggestedPrice: activeTab === 'project' ? suggestedProjectPrice : 0,
        type: activeTab,
        clientName: 'Cliente Não Vinculado', // Futuramente pegar do contexto ou seleção
        projectName: selectedProject
      }
    });
  };


  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Calculadora & Precificação</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Defina honorários de projeto ou orçamentos de obra.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('project')}
          className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'project' ? 'bg-white dark:bg-gray-700 shadow-sm text-teal-600 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <PencilRuler size={18} /> Honorários de Projeto
        </button>
        <button
          onClick={() => setActiveTab('construction')}
          className={`px-6 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'construction' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Hammer size={18} /> Orçamento de Obra
        </button>
      </div>

      {activeTab === 'project' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Clock className="text-teal-500" /> Estimativa de Horas por Fase</h3>
              <div className="space-y-4">
                {projectPhases.map(phase => (
                  <div key={phase.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <span className="font-bold text-gray-700 dark:text-gray-300">{phase.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={phase.hours}
                        onChange={(e) => updatePhase(phase.id, parseFloat(e.target.value) || 0)}
                        className="w-20 text-center font-black bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl py-2 text-teal-600"
                      />
                      <span className="text-xs font-black text-gray-400 uppercase">Horas</span>
                    </div>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center text-gray-900 dark:text-white px-4">
                  <span className="font-black">Total de Horas Estimadas</span>
                  <span className="text-2xl font-black text-teal-600">{totalProjectHours}h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Pricing Summary */}
          <div className="space-y-6">
            <div className="bg-teal-900 text-white rounded-[32px] p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-xs font-bold text-teal-300 uppercase tracking-widest mb-1">Preço Mínimo Sugerido</p>
                  <h2 className="text-4xl font-black tracking-tighter">R$ {suggestedProjectPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-xs text-teal-200">
                    <span>Custo da Hora Técnica</span>
                    <span className="font-bold">R$ {hourlyRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-teal-200">
                    <span>Custo Base (Horas)</span>
                    <span className="font-bold">R$ {projectBaseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-teal-200">
                    <span>Margem ({targetProjectMargin}%) + Impostos</span>
                    <span className="font-bold text-emerald-300">+ R$ {(suggestedProjectPrice - projectBaseCost).toFixed(2)}</span>
                  </div>
                </div>

                <button onClick={handleGenerateProposal} className="w-full py-4 bg-white text-teal-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                  Gerar Proposta
                </button>
              </div>
            </div>

            {!pricingConfig?.monthlyHoursCapacity && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 rounded-2xl text-xs font-bold">
                ⚠️ Configure suas "Horas Produtivas" em Configurações para ter um cálculo preciso da sua Hora Técnica.
              </div>
            )}
          </div>
        </div>
      ) : (
        // CONSTRUCTION CALCULATOR (EXISTING LOGIC)
        <div className="bg-white dark:bg-gray-900 rounded-[40px] shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-10 space-y-6">
            <div className="space-y-4">
              {items.map((item) => {
                const suggestedMargin = getSuggestedMargin(item.type);
                return (
                  <div key={item.id} className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-transparent hover:border-emerald-100 transition-all grid grid-cols-1 lg:grid-cols-12 gap-6 items-end relative">
                    {/* Tipo Selector */}
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                        className="w-full bg-white dark:bg-gray-900 px-3 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs uppercase"
                      >
                        <option value="material">📦 Material</option>
                        <option value="service">🛠️ Serviço</option>
                      </select>
                    </div>

                    <div className="lg:col-span-4 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Item / Serviço</label>
                      <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent font-bold text-gray-900 dark:text-white focus:outline-none text-lg" placeholder="Descrição..." />
                    </div>
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quant.</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-gray-900 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-center" />
                    </div>
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo Unit.</label>
                      <input type="number" value={item.unitCost} onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-gray-900 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold" />
                    </div>
                    <div className="lg:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Margem (%)</label>
                      <div className="relative group/margin">
                        <input type="number" value={item.profitMargin} onChange={(e) => updateItem(item.id, 'profitMargin', parseFloat(e.target.value) || 0)} className="w-full bg-white dark:bg-gray-900 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-center text-emerald-600" />
                        {suggestedMargin > 0 && Math.abs(item.profitMargin - suggestedMargin) > 0.1 && (
                          <button
                            onClick={() => updateItem(item.id, 'profitMargin', parseFloat(suggestedMargin.toFixed(2)))}
                            className={`absolute -top-3 -right-3 ${item.type === 'service' ? 'bg-emerald-600' : 'bg-blue-600'} text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg opacity-0 group-hover/margin:opacity-100 transition-all hover:scale-110 z-10 whitespace-nowrap`}
                            title="Clique para aplicar a margem sugerida"
                          >
                            Sugerido: {suggestedMargin.toFixed(1)}%
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={addItem} className="w-full py-5 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-emerald-50 hover:border-emerald-200 transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Adicionar Novo Item Manual
              </button>
              <button
                onClick={() => {
                  const storedServices = localStorage.getItem('precificaPro_services');
                  if (storedServices) {
                    setCatalogServices(JSON.parse(storedServices));
                  }
                  setShowImportModal(true);
                }}
                className="w-full py-5 border-2 border-dashed border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-2"
              >
                <Briefcase size={18} /> Importar do Catálogo
              </button>
            </div>
          </div>

          <div className="p-10 bg-emerald-600 text-white flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"><Calculator size={32} /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Preço de Venda Sugerido</p>
                <h3 className="text-4xl font-black tracking-tighter">R$ {constructionTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              </div>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={handleGenerateProposal} className="w-full sm:w-auto px-6 py-4 bg-emerald-800/30 text-emerald-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-800/50 transition-all flex items-center justify-center gap-2">
                <FileCheck size={18} /> Proposta
              </button>
              <button onClick={() => setShowSaveModal(true)} className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3">
                Vincular à Obra <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salvar no Projeto */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Vincular Orçamento</h2>
              <button onClick={() => setShowSaveModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2"><Hammer size={12} /> Selecione a Obra Destino</label>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full px-5 py-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl font-black text-teal-600 outline-none">
                  <option value="">Selecione a Obra...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1 text-center">Valor a ser Transmitido</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white text-center">R$ {constructionTotal.toLocaleString('pt-BR')}</p>
              </div>
              <button onClick={handleSaveToProject} className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Confirmar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar do Catálogo */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                  <Briefcase className="text-emerald-500" /> Catálogo de Serviços
                </h2>
                <p className="text-gray-500 text-sm mt-1">Selecione itens para adicionar ao orçamento</p>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors text-gray-400 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar serviço por nome ou categoria..."
                  value={importSearchTerm}
                  onChange={(e) => setImportSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 transition-all shadow-sm font-medium"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              {catalogServices
                .filter(s =>
                  s.name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                  s.category.toLowerCase().includes(importSearchTerm.toLowerCase())
                )
                .map(service => (
                  <div key={service.id} className="group bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-lg transition-all flex items-center justify-between cursor-pointer" onClick={() => handleImportService(service)}>
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500">
                            {service.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-lg">{service.name}</h4>
                        <p className="text-gray-400 text-sm line-clamp-1">{service.description}</p>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        R$ {service.basePrice.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{service.unit}</div>
                      <button className="mt-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase hover:bg-emerald-100 transition-colors opacity-0 group-hover:opacity-100">
                        Adicionar +
                      </button>
                    </div>
                  </div>
                ))}

              {catalogServices.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>Nenhum serviço cadastrado no catálogo.</p>
                  <p className="text-sm mt-2">Vá em "Serviços" no menu lateral para adicionar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CalculatorPage;
