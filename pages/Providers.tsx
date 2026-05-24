
import React, { useEffect, useState } from 'react';
import {
  Plus, Search, HardHat, Star, Mail, Phone,
  ChevronRight, CheckCircle2, X, Building2, User as UserIcon,
  Droplets, Brush, Layers, Hammer, Edit2, Trash2,
  Briefcase, Ruler, Zap, Scissors, Shovel, Info, AlertCircle, Loader2,
  CalendarDays
} from 'lucide-react';
import { Prestador, TipoPessoa } from '../types';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const INITIAL_RAMOS = [
  'Pedreiro/Alvenaria', 
  'Eletricista', 
  'Encanador/Hidráulica', 
  'Pintor', 
  'Gesseiro/Drywall', 
  'Marceneiro', 
  'Serralheiro', 
  'Vidraceiro', 
  'Automação', 
  'Azulejista/Revestimentos'
];

const formatBRL = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const formatContractStatus = (status: string) => {
  const labels: Record<string, string> = {
    cotado: 'Cotado',
    contratado: 'Contratado',
    em_execucao: 'Em execução',
    concluido: 'Concluído',
    cancelado: 'Cancelado'
  };
  return labels[status] || 'Cotado';
};

interface ProviderProjectHistory {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  projectStatus: string;
  role: string;
  contractStatus: string;
  agreedValue: number;
  estimatedStartDate?: string;
  scopeNotes?: string;
  linkedAt: string;
}

const Providers: React.FC = () => {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Prestador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ramos, setRamos] = useState<string[]>(INITIAL_RAMOS);
  const [showModal, setShowModal] = useState(false);
  const [showDossieModal, setShowDossieModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Prestador | null>(null);
  const [providerProjectHistory, setProviderProjectHistory] = useState<ProviderProjectHistory[]>([]);
  const [isLoadingProviderHistory, setIsLoadingProviderHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomRamo, setIsCustomRamo] = useState(false);

  // Mapeamento DB → Frontend
  const mapDbToPrestador = (db: any): Prestador => ({
    id: db.id,
    nome: db.nome,
    tipoCadastro: db.tipo_cadastro,
    cpfCnpj: db.cpf_cnpj,
    ramoAtividade: db.ramo_atividade,
    categoriaProfissional: db.categoria_profissional,
    especialidades: db.especialidades || [],
    ferramentalProprio: db.ferramental_proprio,
    disponibilidadeViagem: db.disponibilidade_viagem,
    email: db.email,
    telefoneCelular: db.telefone_celular,
    statusCadastro: db.status_cadastro,
    notaMedia: db.nota_media,
    experienciaAnos: db.experiencia_anos,
    observacoesInternas: db.observacoes_internas,
  });

  const mapPrestadorToDb = (p: Partial<Prestador>) => ({
    nome: p.nome,
    tipo_cadastro: p.tipoCadastro,
    cpf_cnpj: p.cpfCnpj,
    ramo_atividade: p.ramoAtividade,
    categoria_profissional: p.categoriaProfissional,
    especialidades: p.especialidades || [],
    ferramental_proprio: p.ferramentalProprio ?? true,
    disponibilidade_viagem: p.disponibilidadeViagem ?? false,
    email: p.email,
    telefone_celular: p.telefoneCelular,
    status_cadastro: p.statusCadastro || 'aprovado',
    nota_media: p.notaMedia || 5.0,
    experiencia_anos: p.experienciaAnos || 0,
    observacoes_internas: p.observacoesInternas,
  });

  useEffect(() => {
    if (user) fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('prestadores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar prestadores:', error);
    } else if (data) {
      setProviders(data.map(mapDbToPrestador));
    }
    setIsLoading(false);
  };

  const fetchProviderProjectHistory = async (providerId: string) => {
    setIsLoadingProviderHistory(true);
    const { data, error } = await supabase
      .from('project_team_members')
      .select(`
        id,
        project_id,
        role,
        contract_status,
        agreed_value,
        estimated_start_date,
        scope_notes,
        created_at,
        projects (
          name,
          client_name,
          status
        )
      `)
      .eq('prestador_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Histórico de obras do prestador indisponível:', error.message);
      setProviderProjectHistory([]);
      setIsLoadingProviderHistory(false);
      return;
    }

    setProviderProjectHistory((data || []).map((item: any) => {
      const project = Array.isArray(item.projects) ? item.projects[0] : item.projects;
      return {
        id: item.id,
        projectId: item.project_id,
        projectName: project?.name || 'Obra não encontrada',
        clientName: project?.client_name || 'Cliente não informado',
        projectStatus: project?.status || 'active',
        role: item.role || 'Equipe',
        contractStatus: item.contract_status || 'cotado',
        agreedValue: Number(item.agreed_value || 0),
        estimatedStartDate: item.estimated_start_date || '',
        scopeNotes: item.scope_notes || '',
        linkedAt: item.created_at
      };
    }));
    setIsLoadingProviderHistory(false);
  };

  const initialFormState: Partial<Prestador> = {
    tipoCadastro: 'PF',
    nome: '',
    cpfCnpj: '',
    ramoAtividade: 'Pedreiro/Alvenaria',
    categoriaProfissional: 'Autônomo',
    especialidades: [],
    ferramentalProprio: true,
    disponibilidadeViagem: false,
    email: '',
    telefoneCelular: '',
    statusCadastro: 'aprovado',
    experienciaAnos: 0,
    notaMedia: 5.0
  };

  const [formData, setFormData] = useState<Partial<Prestador>>(initialFormState);

  const filteredProviders = providers.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ramoAtividade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsCustomRamo(false);
    setShowModal(true);
  };

  const handleOpenDossie = (provider: Prestador) => {
    setSelectedProvider(provider);
    setProviderProjectHistory([]);
    setShowDossieModal(true);
    fetchProviderProjectHistory(provider.id);
  };

  const handleToggleEspecialidade = (esp: string) => {
    const atual = formData.especialidades || [];
    if (atual.includes(esp)) {
      setFormData({ ...formData, especialidades: atual.filter(e => e !== esp) });
    } else {
      setFormData({ ...formData, especialidades: [...atual, esp] });
    }
  };

  const getEspecialidadesSugestao = (ramo: string): string[] => {
    const sugestoes: Record<string, string[]> = {
      'Pedreiro/Alvenaria': ['Levantamento', 'Reboco', 'Contra-piso', 'Telhado'],
      'Azulejista/Revestimentos': ['Porcelanato', 'Pastilhas', 'Grandes Formatos'],
      'Eletricista': ['Baixa Tensão', 'Quadro de Força', 'Infraestrutura'],
      'Encanador/Hidráulica': ['PPR/Água Quente', 'Esgoto', 'Gás'],
      'Pintor': ['Airless', 'Cimento Queimado', 'Massa Corrida'],
      'Gesseiro/Drywall': ['Sanca', 'Forro Liso', 'Paredes Drywall'],
      'Marceneiro': ['Cozinha Planejada', 'MDF', 'Madeira Maciça'],
      'Serralheiro': ['Estrutura Metálica', 'Portões', 'Corrimão'],
      'Vidraceiro': ['Box', 'Espelhos', 'Guarda-corpo'],
      'Automação': ['Lutron', 'Control4', 'Redes Wi-Fi']
    };
    return sugestoes[ramo] || [];
  };

  const getRamoIcon = (ramo: string) => {
    switch (ramo) {
      case 'Pedreiro/Alvenaria': return <Shovel size={18} />;
      case 'Azulejista/Revestimentos': return <Layers size={18} />;
      case 'Eletricista': return <Zap size={18} />;
      case 'Encanador/Hidráulica': return <Droplets size={18} />;
      case 'Pintor': return <Brush size={18} />;
      case 'Marceneiro': return <Hammer size={18} />;
      default: return <HardHat size={18} />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Se for um novo ramo, adiciona à lista global de ramos para futuras seleções
    if (formData.ramoAtividade && !ramos.includes(formData.ramoAtividade)) {
      setRamos(prev => [...prev, formData.ramoAtividade!].sort());
    }

    const dbData = mapPrestadorToDb(formData);
    const { data, error } = await supabase
      .from('prestadores')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar prestador:', error);
      alert('Erro ao salvar: ' + error.message);
    } else if (data) {
      setProviders([mapDbToPrestador(data), ...providers]);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Equipe e Prestadores</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Sua rede de especialistas técnicos e mão de obra operacional.</p>
        </div>
        <button 
          onClick={handleOpenCreate} 
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Profissional</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Busque por nome ou profissão..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all shadow-sm font-bold" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-gray-400 font-bold">Carregando prestadores...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <HardHat className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400 font-bold">Nenhum prestador cadastrado</p>
            <button onClick={handleOpenCreate} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all">
              <Plus size={16} className="inline mr-2" />Adicionar Primeiro
            </button>
          </div>
        ) : (
        filteredProviders.map(provider => (
          <div key={provider.id} className="group bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all relative">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white`}>
                  {getRamoIcon(provider.ramoAtividade)}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                   <h3 className="font-black text-gray-900 dark:text-white leading-tight truncate">{provider.nome}</h3>
                   <div className="flex items-center gap-1.5 mt-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-black text-gray-500">{provider.notaMedia}</span>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{provider.ramoAtividade}</span>
                   </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {provider.especialidades.map(esp => (
                <span key={esp} className="px-2 py-0.5 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-md text-[9px] font-black uppercase border border-gray-100 dark:border-gray-700">{esp}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-gray-400 uppercase">WhatsApp</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{provider.telefoneCelular || 'Não informado'}</span>
               </div>
               <div className="flex flex-col text-right">
                  <span className="text-[8px] font-black text-gray-400 uppercase">Experiência</span>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{provider.experienciaAnos} anos</span>
               </div>
            </div>

            <button onClick={() => handleOpenDossie(provider)} className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2">Dossiê Profissional <ChevronRight size={14} /></button>
          </div>
        ))
        )}
      </div>

      {/* Modal Cadastro de Novo Profissional */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-md">
          <div className="bg-white dark:bg-gray-950 rounded-[40px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Adicionar Profissional</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Insira os dados do profissional ou equipe</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <form id="provider-form" onSubmit={handleSubmit} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">1. Identificação</h3>
                    
                    <div className="flex gap-2">
                       {(['PF', 'PJ'] as TipoPessoa[]).map(tipo => (
                         <button 
                           key={tipo}
                           type="button" 
                           onClick={() => setFormData({ ...formData, tipoCadastro: tipo })} 
                           className={`flex-1 py-4 rounded-2xl font-black text-[10px] transition-all border flex items-center justify-center gap-2 ${formData.tipoCadastro === tipo ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 border-gray-100 dark:border-gray-800'}`}
                         >
                           {tipo === 'PF' ? <UserIcon size={14} /> : <Building2 size={14} />} 
                           {tipo === 'PF' ? 'PESSOA FÍSICA' : 'PESSOA JURÍDICA'}
                         </button>
                       ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Profissão Principal</label>
                        <button 
                          type="button" 
                          onClick={() => {
                            setIsCustomRamo(!isCustomRamo);
                            setFormData({...formData, ramoAtividade: '', especialidades: []});
                          }} 
                          className="text-[9px] font-black text-emerald-600 uppercase hover:underline"
                        >
                          {isCustomRamo ? 'Selecionar da Lista' : 'Inserir Profissão Manual'}
                        </button>
                      </div>

                      {isCustomRamo ? (
                        <div className="relative animate-in slide-in-from-top-2">
                          <input 
                            required
                            type="text" 
                            value={formData.ramoAtividade} 
                            onChange={(e) => setFormData({...formData, ramoAtividade: e.target.value})}
                            placeholder="Digite a profissão (ex: Arquiteto, Calheiro...)"
                            className="w-full px-5 py-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl font-bold focus:border-emerald-500 outline-none shadow-inner"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-600 pointer-events-none">
                            <Plus size={16} />
                            <span className="text-[8px] font-black uppercase">Novo Ramo</span>
                          </div>
                        </div>
                      ) : (
                        <select 
                          required
                          value={formData.ramoAtividade} 
                          onChange={(e) => setFormData({...formData, ramoAtividade: e.target.value as any, especialidades: []})} 
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none transition-all"
                        >
                          <option value="" disabled>Selecione uma profissão...</option>
                          {ramos.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Profissional / Empresa</label>
                      <input 
                        required 
                        type="text" 
                        value={formData.nome} 
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })} 
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none" 
                        placeholder="Ex: João da Silva" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF/CNPJ</label>
                         <input required type="text" value={formData.cpfCnpj} onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none" placeholder="000.000.000-00" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</label>
                         <input required type="tel" value={formData.telefoneCelular} onChange={(e) => setFormData({ ...formData, telefoneCelular: e.target.value })} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none" placeholder="(00) 00000-0000" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-teal-600 uppercase tracking-widest flex items-center gap-2 border-b border-teal-50 pb-2">2. Qualificações</h3>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        {isCustomRamo ? 'Defina Especialidades Manuais' : `Especialidades de ${formData.ramoAtividade || '...'}`}
                      </label>
                      
                      {!isCustomRamo && formData.ramoAtividade && getEspecialidadesSugestao(formData.ramoAtividade).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {getEspecialidadesSugestao(formData.ramoAtividade).map(esp => {
                            const isSelected = formData.especialidades?.includes(esp);
                            return (
                              <button 
                                key={esp} 
                                type="button" 
                                onClick={() => handleToggleEspecialidade(esp)} 
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${isSelected ? 'bg-teal-600 text-white border-teal-600 shadow-lg' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'}`}
                              >
                                {esp}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                           <Info size={18} className="mx-auto text-gray-300 mb-2" />
                           <p className="text-[9px] font-bold text-gray-400 uppercase">Para profissões manuais, defina as especialidades no dossiê após o cadastro.</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Anos de Experiência</label>
                         <input type="number" value={formData.experienciaAnos} onChange={(e) => setFormData({...formData, experienciaAnos: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ferramental?</label>
                         <select value={formData.ferramentalProprio ? 'S' : 'N'} onChange={(e) => setFormData({...formData, ferramentalProprio: e.target.value === 'S'})} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold focus:border-emerald-500 outline-none">
                            <option value="S">Próprio</option>
                            <option value="N">Fornecido p/ Obra</option>
                         </select>
                       </div>
                    </div>

                    <div className="p-6 bg-teal-50 dark:bg-teal-900/10 rounded-3xl border border-teal-100 dark:border-teal-800 flex items-start gap-4">
                       <AlertCircle size={18} className="text-teal-600 shrink-0" />
                       <p className="text-[10px] font-bold text-teal-900 dark:text-teal-300 uppercase leading-relaxed">Novas profissões inseridas manualmente serão salvas no banco de dados do escritório para seleções futuras.</p>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-8 border-t border-gray-50 dark:border-gray-800 flex gap-4 bg-gray-50/50 dark:bg-gray-900/50 shrink-0 rounded-b-[40px]">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white dark:bg-gray-800 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-gray-100 dark:border-gray-700 hover:bg-gray-50 transition-all shadow-sm">Cancelar</button>
              <button form="provider-form" type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95"><CheckCircle2 size={18} /> Finalizar Cadastro</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dossie Profissional (Simples) */}
      {showDossieModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[70] p-4 backdrop-blur-xl">
          <div className="bg-white dark:bg-gray-950 rounded-[48px] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-emerald-600 rounded-[24px] flex items-center justify-center text-white shadow-xl">
                    {getRamoIcon(selectedProvider.ramoAtividade)}
                 </div>
                 <div>
                   <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedProvider.nome}</h2>
                   <div className="flex gap-3 mt-1">
                     <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">{selectedProvider.categoriaProfissional}</span>
                     <span className="px-3 py-1 bg-white dark:bg-gray-800 text-amber-500 border border-amber-100 dark:border-amber-900/30 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Star size={10} className="fill-amber-500"/> {selectedProvider.notaMedia}
                     </span>
                   </div>
                 </div>
               </div>
               <button onClick={() => setShowDossieModal(false)} className="p-4 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 transition-all"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Briefcase size={14} className="text-emerald-500" /> Canais</h4>
                     <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-3">
                        <div className="flex items-center gap-3"><Mail size={16} className="text-gray-400"/><span className="text-sm font-bold truncate">{selectedProvider.email || 'Não informado'}</span></div>
                        <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400"/><span className="text-sm font-bold">{selectedProvider.telefoneCelular}</span></div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Ruler size={14} className="text-emerald-500" /> Especialidades</h4>
                     <div className="flex flex-wrap gap-2">
                        {selectedProvider.especialidades.map(esp => (
                           <span key={esp} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-[10px] font-black text-gray-500 uppercase">{esp}</span>
                        ))}
                        {selectedProvider.especialidades.length === 0 && <span className="text-xs italic text-gray-400">Nenhuma especialidade listada.</span>}
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Building2 size={14} className="text-emerald-500" />
                      Histórico em obras
                    </h4>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                      {providerProjectHistory.length} vínculo(s)
                    </span>
                  </div>

                  <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
                    {isLoadingProviderHistory ? (
                      <div className="flex items-center justify-center gap-3 py-8 text-sm font-bold text-gray-500">
                        <Loader2 size={18} className="animate-spin text-emerald-500" />
                        Carregando histórico...
                      </div>
                    ) : providerProjectHistory.length ? (
                      <div className="space-y-3">
                        {providerProjectHistory.map(history => (
                          <div key={history.id} className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-black text-gray-900 dark:text-white">{history.projectName}</p>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">{history.role}</p>
                                <p className="mt-2 text-xs font-bold text-gray-500">{history.clientName}</p>
                                {history.scopeNotes && <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{history.scopeNotes}</p>}
                              </div>
                              <div className="text-left sm:text-right">
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                    {formatContractStatus(history.contractStatus)}
                                  </span>
                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500 dark:bg-gray-800">
                                    {history.projectStatus === 'completed' ? 'Obra concluída' : history.projectStatus === 'on_hold' ? 'Obra pausada' : 'Obra ativa'}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs font-black text-gray-900 dark:text-white">
                                  {history.agreedValue ? formatBRL(history.agreedValue) : 'Valor não informado'}
                                </p>
                                {history.estimatedStartDate && (
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Início: {new Date(`${history.estimatedStartDate}T00:00:00`).toLocaleDateString()}
                                  </p>
                                )}
                                <p className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:justify-end">
                                  <CalendarDays size={12} />
                                  {new Date(history.linkedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <Building2 size={28} className="mx-auto text-gray-300" />
                        <p className="mt-3 text-sm font-black text-gray-900 dark:text-white">Nenhuma obra vinculada ainda</p>
                        <p className="mt-1 text-xs font-bold text-gray-500">Vincule este prestador na aba Comunicação de uma obra para formar o histórico.</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Providers;
