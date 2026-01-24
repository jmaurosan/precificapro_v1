
import { Briefcase, Edit2, Filter, Plus, Search, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  unit: string;
}

import { Save, X } from 'lucide-react';

const DEFAULT_SERVICES: Service[] = [
  { id: '1', name: 'Desenvolvimento Frontend', description: 'Criação de interfaces web modernas e responsivas utilizando React ou Next.js.', category: 'Desenvolvimento', basePrice: 150, unit: 'hora' },
  { id: '2', name: 'Design de Interface (UX/UI)', description: 'Prototipagem de alta fidelidade e design visual focado na experiência do usuário.', category: 'Design', basePrice: 200, unit: 'hora' },
  { id: '3', name: 'Manutenção de Projetos', description: 'Suporte técnico contínuo e atualizações de segurança mensais.', category: 'Suporte', basePrice: 500, unit: 'mês' },
  { id: '4', name: 'Consultoria de SEO', description: 'Otimização para motores de busca e análise de performance web.', category: 'Marketing', basePrice: 1200, unit: 'projeto' },
];

const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchServices();
    }
  }, [user]);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('catalog_services')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
    } else {
      if (data && data.length > 0) {
        setServices(data.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          category: s.category || '',
          basePrice: Number(s.base_price),
          unit: s.unit || ''
        })));
      } else {
        // If no services, show defaults but don't save yet
        setServices(DEFAULT_SERVICES);
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      const { error } = await supabase.from('catalog_services').delete().eq('id', id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        setServices(services.filter(s => s.id !== id));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const payload = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      base_price: parseFloat(formData.get('basePrice') as string) || 0,
      description: formData.get('description') as string,
      user_id: user?.id
    };

    if (editingService) {
      const { error } = await supabase
        .from('catalog_services')
        .update(payload)
        .eq('id', editingService.id);

      if (error) alert('Erro ao atualizar: ' + error.message);
      else await fetchServices();
    } else {
      const { error } = await supabase
        .from('catalog_services')
        .insert([payload]);

      if (error) alert('Erro ao salvar: ' + error.message);
      else await fetchServices();
    }

    setShowModal(false);
    setEditingService(null);
  };

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Serviços e Catálogo</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Defina os serviços padrão que você oferece para agilizar seus orçamentos.</p>
        </div>
        <button
          onClick={() => { setEditingService(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Serviço</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 dark:focus:border-emerald-500 text-gray-900 dark:text-white transition-all shadow-sm"
          />
        </div>
        <button className="px-6 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-all shadow-sm">
          <Filter size={20} />
          <span>Filtros</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="group bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Briefcase size={28} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setEditingService(service);
                    setShowModal(true);
                  }}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                {service.category}
              </span>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">{service.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{service.description}</p>
            </div>

            <div className="pt-6 border-t border-gray-50 dark:border-gray-800 flex items-baseline justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preço Base</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {service.basePrice.toLocaleString('pt-BR')}<span className="text-sm font-bold text-gray-400">/{service.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={32} className="text-gray-300" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">Nenhum serviço encontrado</p>
          <p className="text-gray-500">Tente ajustar seus filtros ou busca.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
            <div className="p-8 pb-0 flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingService(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome do Serviço</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingService?.name}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all"
                  placeholder="Ex: Desenvolvimento Web"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoria</label>
                  <input
                    name="category"
                    type="text"
                    required
                    defaultValue={editingService?.category}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Unidade</label>
                  <select
                    name="unit"
                    defaultValue={editingService?.unit || 'hora'}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all"
                  >
                    <option value="hora">Por Hora</option>
                    <option value="projeto">Por Projeto</option>
                    <option value="unidade">Por Unidade</option>
                    <option value="mês">Por Mês</option>
                    <option value="m²">Por m²</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preço Base (R$)</label>
                <input
                  name="basePrice"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingService?.basePrice}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Descrição Completa</label>
                <textarea
                  name="description"
                  defaultValue={editingService?.description}
                  rows={3}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingService(null); }}
                  className="flex-1 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
