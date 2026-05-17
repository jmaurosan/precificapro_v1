
import React, { useEffect, useState } from 'react';
import {
  Users, HardHat, Building2, Search, Plus, Filter,
  ExternalLink, Mail, Phone, Home, Star, Cpu, Zap,
  ChevronRight, CreditCard, CheckCircle2, X, MapPin, Hash,
  Tag, Package, Globe, User as UserIcon, ShoppingBag, ArrowRight,
  MessageCircle, Info, Bookmark, Edit2, Trash2, Loader2
} from 'lucide-react';
import ClientsPage from './Clients';
import Providers from './Providers';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

type TabType = 'clients' | 'providers' | 'suppliers';

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  category: string;
  marcas: string[];
  email: string;
  fone: string;
  website?: string;
}

const Registrations: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('clients');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Mapeamento DB ↔ Frontend
  const mapDbToSupplier = (db: any): Supplier => ({
    id: db.id,
    name: db.name,
    contactName: db.contact_name || '',
    category: db.category,
    marcas: db.marcas || [],
    email: db.email || '',
    fone: db.fone || '',
    website: db.website || '',
  });

  const mapSupplierToDb = (s: Partial<Supplier>) => ({
    name: s.name,
    contact_name: s.contactName,
    category: s.category,
    marcas: s.marcas || [],
    email: s.email,
    fone: s.fone,
    website: s.website,
  });

  useEffect(() => {
    if (user) fetchSuppliers();
  }, [user]);

  const fetchSuppliers = async () => {
    setIsLoadingSuppliers(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } else if (data) {
      setSuppliers(data.map(mapDbToSupplier));
    }
    setIsLoadingSuppliers(false);
  };

  const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({
    name: '',
    contactName: '',
    category: 'Materiais Elétricos',
    marcas: [],
    email: '',
    fone: '',
    website: ''
  });

  const handleOpenCreateSupplier = () => {
    setIsEditing(false);
    setSupplierFormData({ name: '', contactName: '', category: 'Materiais Elétricos', marcas: [], email: '', fone: '', website: '' });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const marcasArray = typeof supplierFormData.marcas === 'string'
      ? (supplierFormData.marcas as string).split(',').map(m => m.trim()).filter(m => m !== '')
      : supplierFormData.marcas || [];

    const dbData = { ...mapSupplierToDb(supplierFormData), marcas: marcasArray };

    if (isEditing && supplierFormData.id) {
      const { data, error } = await supabase
        .from('suppliers')
        .update(dbData)
        .eq('id', supplierFormData.id)
        .select()
        .single();
      if (error) {
        console.error('Erro ao atualizar fornecedor:', error);
        alert('Erro ao atualizar: ' + error.message);
      } else if (data) {
        setSuppliers(suppliers.map(s => s.id === supplierFormData.id ? mapDbToSupplier(data) : s));
      }
    } else {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([dbData])
        .select()
        .single();
      if (error) {
        console.error('Erro ao criar fornecedor:', error);
        alert('Erro ao salvar: ' + error.message);
      } else if (data) {
        setSuppliers([mapDbToSupplier(data), ...suppliers]);
      }
    }
    setShowSupplierModal(false);
  };

  // Função para abrir WhatsApp
  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  // Função para abrir Website
  const openWebsite = (url?: string) => {
    if (!url) return;
    const protocol = url.startsWith('http') ? '' : 'https://';
    window.open(`${protocol}${url}`, '_blank');
  };

  const renderSuppliers = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Fornecedores de Materiais</h2>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Catálogo de parceiros de suprimentos e logística.</p>
        </div>
        <button 
          onClick={handleOpenCreateSupplier}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Novo Fornecedor</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoadingSuppliers ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-gray-400 font-bold">Carregando fornecedores...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
            <Building2 className="w-12 h-12 text-gray-200" />
            <p className="text-gray-400 font-bold">Nenhum fornecedor cadastrado</p>
            <button onClick={handleOpenCreateSupplier} className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all">
              <Plus size={16} className="inline mr-2" />Adicionar Primeiro
            </button>
          </div>
        ) : (
        suppliers.map(s => (
          <div 
            key={s.id} 
            className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group relative cursor-pointer"
            onClick={() => { setSelectedSupplier(s); setShowCatalogModal(true); }}
          >
            <div className="flex items-center gap-4 mb-6">
               <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                  <Building2 size={28} />
               </div>
               <div className="flex-1 min-w-0 pr-12">
                  <h3 className="font-black text-gray-900 dark:text-white leading-tight truncate">{s.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <UserIcon size={10} className="text-orange-500" />
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate">{s.contactName}</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4 mb-6">
               <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 rounded text-[9px] font-black text-orange-600 uppercase">{s.category}</span>
               </div>
               
               {/* Botões de Ação Direta */}
               <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(s.fone); }}
                    className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openWebsite(s.website); }}
                    className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  >
                    <Globe size={14} /> Website
                  </button>
               </div>
            </div>
            
            <div className="w-full py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:bg-orange-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
              Dossiê & Catálogo <ChevronRight size={14} />
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Central de Cadastros</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Rede de contatos profissional do escritório.</p>
        </div>
        <div className="flex p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[28px] shadow-sm">
          <button onClick={() => setActiveTab('clients')} className={`flex items-center gap-2 px-6 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'clients' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}>
            <Users size={16} /> Clientes
          </button>
          <button onClick={() => setActiveTab('providers')} className={`flex items-center gap-2 px-6 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'providers' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400'}`}>
            <HardHat size={16} /> Prestadores
          </button>
          <button onClick={() => setActiveTab('suppliers')} className={`flex items-center gap-2 px-6 py-3 rounded-[22px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400'}`}>
            <Building2 size={16} /> Fornecedores
          </button>
        </div>
      </div>
      <div className="animate-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'clients' && <ClientsPage />}
        {activeTab === 'providers' && <Providers />}
        {activeTab === 'suppliers' && renderSuppliers()}
      </div>

      {/* Reuso do Modal de Catálogo para incluir as novas funções de link */}
      {showCatalogModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-xl">
          <div className="bg-white dark:bg-gray-950 rounded-[48px] w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-orange-50/30">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 bg-orange-600 rounded-3xl flex items-center justify-center text-white shadow-xl">
                    <ShoppingBag size={32} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedSupplier.name}</h2>
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">{selectedSupplier.category}</p>
                 </div>
               </div>
               <button onClick={() => setShowCatalogModal(false)} className="p-3 hover:bg-white dark:hover:bg-gray-800 rounded-2xl transition-all shadow-sm">
                 <X size={24} />
               </button>
            </div>
            <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10 overflow-y-auto">
               <div className="space-y-6">
                  <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[32px] border border-gray-100 space-y-6">
                     <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Canais Diretos</h4>
                     <button 
                        onClick={() => openWhatsApp(selectedSupplier.fone)}
                        className="w-full flex items-center justify-between p-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                     >
                        WhatsApp Oficial <MessageCircle size={18} />
                     </button>
                     <button 
                        onClick={() => openWebsite(selectedSupplier.website)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-orange-500 transition-all shadow-sm"
                     >
                        Acessar Website <ExternalLink size={18} />
                     </button>
                  </div>
               </div>
               <div className="lg:col-span-2 space-y-6">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marcas do Fornecedor</h4>
                  <div className="flex flex-wrap gap-2">
                     {selectedSupplier.marcas.map(m => (
                       <span key={m} className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-black uppercase border border-orange-100">{m}</span>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
