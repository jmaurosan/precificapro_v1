
import {
  Bell,
  Briefcase,
  Building,
  Calculator,
  Camera,
  Check,
  CreditCard,
  Download,
  Globe,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Percent,
  Phone,
  Shield,
  Sun,
  TrendingUp,
  Upload,
  User as UserIcon
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { supabase } from '../lib/supabaseClient';
import { CompanyProfile, PricingConfiguration } from '../types';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [companyData, setCompanyData] = useState<CompanyProfile>({
    name: '', cnpj: '', email: '', phone: '', website: '', logo: null,
    address: { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' }
  });

  const [pricingConfig, setPricingConfig] = useState<PricingConfiguration>({
    fixedCosts: 0, monthlyRevenue: 0, monthlyHoursCapacity: 160,
    taxRate: 6, variableRate: 0, serviceMargin: 40, materialMargin: 15
  });

  const [notifications, setNotifications] = useState({
    email: true, proposals: true, updates: false,
  });

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data && !error) {
      setCompanyData({
        name: data.company_name || '',
        cnpj: data.cnpj || '',
        email: user?.email || '',
        phone: data.phone || '',
        website: data.website || '',
        logo: data.avatar_url,
        address: data.address || { logradouro: '', numero: '', bairro: '', cidade: '', uf: '', cep: '' }
      });
      if (data.pricing_config) setPricingConfig(data.pricing_config);
      if (data.notifications) setNotifications(data.notifications);
    }

    if (user?.organization?.id) {
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization.id)
        .maybeSingle();

      if (organization) {
        setCompanyData((current) => ({
          ...current,
          name: organization.name || current.name,
          cnpj: organization.document || current.cnpj,
          email: organization.email || current.email,
          phone: organization.phone || current.phone,
          website: organization.website || current.website,
          logo: organization.logo_url || current.logo,
          address: organization.address || current.address,
        }));
        if (organization.pricing_config) setPricingConfig(organization.pricing_config);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: companyData.name,
        cnpj: companyData.cnpj,
        phone: companyData.phone,
        website: companyData.website,
        avatar_url: companyData.logo,
        address: companyData.address,
        pricing_config: pricingConfig,
        notifications: notifications,
        updated_at: new Date().toISOString()
      })
      .eq('id', user?.id);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
      setLoading(false);
      return;
    }

    if (user?.organization?.id) {
      const { error: organizationError } = await supabase
        .from('organizations')
        .update({
          name: companyData.name,
          document: companyData.cnpj,
          email: companyData.email,
          phone: companyData.phone,
          website: companyData.website,
          logo_url: companyData.logo,
          address: companyData.address,
          pricing_config: pricingConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.organization.id);

      if (organizationError) {
        alert('Erro ao salvar escritório: ' + organizationError.message);
        setLoading(false);
        return;
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setLoading(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyData({ ...companyData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Configurações</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">Personalize sua conta e as preferências do sistema.</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl ${saved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20 active:scale-95'
            }`}
        >
          {saved ? <><Check size={20} /> Alterações Salvas</> : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* SEÇÃO: DADOS DO ESCRITÓRIO */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Building size={22} className="text-emerald-600" />
              DADOS DO ESCRITÓRIO / FIRMA
            </h2>
          </div>

          <div className="p-8 space-y-10">
            {/* Logo do Escritório */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group">
                <div className="w-32 h-32 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 group-hover:border-emerald-500 transition-all overflow-hidden relative">
                  {companyData.logo ? (
                    <img src={companyData.logo} alt="Logo Escritório" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-4">
                      <Camera size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-tight">Sua Logo Aqui</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-900">
                  <Upload size={18} />
                </div>
              </div>
              <div className="text-center md:text-left space-y-2">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Identidade Visual do Escritório</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">Esta logo aparecerá no cabeçalho das suas propostas comerciais e orçamentos gerados em PDF.</p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Recomendado: 512x512px (PNG ou SVG)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Briefcase size={12} /> Nome do Escritório / Razão Social
                  </label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    placeholder="Ex: Arquiteto João Silva e Associados"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={12} /> CNPJ / Registro Profissional (CAU/CREA)
                  </label>
                  <input
                    type="text"
                    value={companyData.cnpj}
                    onChange={(e) => setCompanyData({ ...companyData, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail size={12} /> E-mail Comercial
                    </label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                      placeholder="contato@escritorio.com"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={12} /> Telefone
                    </label>
                    <input
                      type="text"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={12} /> Website / Portfolio
                  </label>
                  <input
                    type="text"
                    value={companyData.website}
                    onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                    placeholder="www.escritorio.com"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Endereço do Escritório */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
                <MapPin size={12} className="text-emerald-500" /> Endereço Físico / Sede
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logradouro / Rua</label>
                  <input
                    type="text"
                    value={companyData.address.logradouro}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, logradouro: e.target.value } })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Número</label>
                  <input
                    type="text"
                    value={companyData.address.numero}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, numero: e.target.value } })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bairro</label>
                  <input
                    type="text"
                    value={companyData.address.bairro}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, bairro: e.target.value } })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cidade</label>
                  <input
                    type="text"
                    value={companyData.address.cidade}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, cidade: e.target.value } })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={companyData.address.uf}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, uf: e.target.value.toUpperCase() } })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CEP</label>
                  <input
                    type="text"
                    value={companyData.address.cep}
                    onChange={(e) => setCompanyData({ ...companyData, address: { ...companyData.address, cep: e.target.value } })}
                    placeholder="00000-000"
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FINANCIAL INTELLIGENCE SECTION */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden ring-4 ring-teal-500/5">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <TrendingUp size={22} className="text-teal-600" />
              INTELIGÊNCIA FINANCEIRA & MARGEM (BDI)
            </h2>
          </div>
          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Configure os parâmetros do seu escritório para que a calculadora gere margens precisas e lucrativas.</p>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custos Fixos Mensais (R$)</label>
                  <input
                    type="number"
                    value={pricingConfig.fixedCosts}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, fixedCosts: parseFloat(e.target.value) || 0 })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-900 dark:text-white"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faturamento Médio (R$)</label>
                  <input
                    type="number"
                    value={pricingConfig.monthlyRevenue}
                    onChange={(e) => setPricingConfig({ ...pricingConfig, monthlyRevenue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-900 dark:text-white"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horas Produtivas / Mês</label>
                <input
                  type="number"
                  value={pricingConfig.monthlyHoursCapacity}
                  onChange={(e) => setPricingConfig({ ...pricingConfig, monthlyHoursCapacity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-900 dark:text-white"
                  placeholder="Ex: 160"
                />
                <p className="text-[9px] text-gray-400 font-medium pl-2">Soma das horas úteis de toda a equipe técnica.</p>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Impostos (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricingConfig.taxRate}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-5 pr-8 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-900 dark:text-white"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Var./Comissão (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricingConfig.variableRate}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, variableRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-5 pr-8 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl font-bold text-gray-900 dark:text-white"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Lucro Serviços (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricingConfig.serviceMargin}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, serviceMargin: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-5 pr-8 py-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl font-black text-emerald-700 dark:text-emerald-400"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Lucro Materiais (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={pricingConfig.materialMargin}
                      onChange={(e) => setPricingConfig({ ...pricingConfig, materialMargin: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-5 pr-8 py-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl font-black text-blue-700 dark:text-blue-400"
                    />
                    <Percent size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* SIMULATION CARD */}
            <div className="bg-teal-900 text-white rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6 opacity-80">
                  <Calculator size={20} /> <span className="text-xs font-black uppercase tracking-widest">Simulador de Markup</span>
                </div>

                {(() => {
                  const fixedCostPercentage = pricingConfig.monthlyRevenue > 0 ? (pricingConfig.fixedCosts / pricingConfig.monthlyRevenue) * 100 : 0;
                  const hourlyRate = pricingConfig.monthlyHoursCapacity > 0 ? pricingConfig.fixedCosts / pricingConfig.monthlyHoursCapacity : 0;

                  const calculateMarkup = (targetMargin: number) => {
                    const totalDeductions = pricingConfig.taxRate + pricingConfig.variableRate + targetMargin + fixedCostPercentage;
                    const divisor = (100 - totalDeductions) / 100;
                    const markup = divisor > 0 ? 1 / divisor : 0;
                    const suggested = divisor > 0 ? ((1 / divisor) - 1) * 100 : 0;
                    return { markup, suggested };
                  };

                  const service = calculateMarkup(pricingConfig.serviceMargin);
                  const material = calculateMarkup(pricingConfig.materialMargin);

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm space-y-1">
                          <p className="text-[10px] font-black text-emerald-300 uppercase">Serviços</p>
                          <p className="text-2xl font-black tracking-tighter">{service.markup.toFixed(2)}x</p>
                          <p className="text-[10px] text-gray-300">Margem Sugerida: {service.suggested.toFixed(1)}%</p>
                        </div>
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm space-y-1">
                          <p className="text-[10px] font-black text-blue-300 uppercase">Materiais</p>
                          <p className="text-2xl font-black tracking-tighter">{material.markup.toFixed(2)}x</p>
                          <p className="text-[10px] text-gray-300">Margem Sugerida: {material.suggested.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-teal-950/50 rounded-xl space-y-2 text-[10px] text-teal-200">
                        <div className="flex justify-between"><span>Custos Fixos:</span> <span className="font-bold">{fixedCostPercentage.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Impostos:</span> <span className="font-bold">{pricingConfig.taxRate}%</span></div>
                        <div className="flex justify-between pt-2 border-t border-teal-900">
                          <span>Sua Hora Técnica (Custo):</span>
                          <span className="font-bold text-white text-xs">R$ {hourlyRate.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <UserIcon size={22} className="text-emerald-500" />
              INFORMAÇÕES PESSOAIS DO USUÁRIO
            </h2>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-[28px] flex items-center justify-center border-2 border-emerald-100 dark:border-emerald-800 group-hover:border-emerald-500 transition-all overflow-hidden">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-4xl">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg border-2 border-white dark:border-gray-900 hover:scale-110 transition-all">
                  <Upload size={14} />
                </button>
              </div>
              <div>
                <p className="font-black text-gray-900 dark:text-white text-2xl">{user?.name || 'Usuário'}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Administrador do Sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome de Exibição</label>
                <input type="text" defaultValue={user?.name} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Endereço de Email</label>
                <input type="email" defaultValue={user?.email} className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-gray-900 dark:text-white transition-all font-bold" />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Palette size={22} className="text-cyan-500" />
              PREFERÊNCIAS VISUAIS
            </h2>
          </div>
          <div className="p-8">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-widest">Tema da Interface</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <button
                onClick={() => setTheme('light')}
                className={`relative p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${theme === 'light'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-xl shadow-emerald-100 dark:shadow-none'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
              >
                <Sun size={32} className={theme === 'light' ? 'text-emerald-600' : 'text-gray-400'} />
                <p className={`font-black uppercase tracking-widest text-xs ${theme === 'light' ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-500'}`}>Claro</p>
                {theme === 'light' && <div className="absolute top-4 right-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-950"></div>}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`relative p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-xl shadow-emerald-100 dark:shadow-none'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
              >
                <Moon size={32} className={theme === 'dark' ? 'text-emerald-600' : 'text-gray-400'} />
                <p className={`font-black uppercase tracking-widest text-xs ${theme === 'dark' ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-500'}`}>Escuro</p>
                {theme === 'dark' && <div className="absolute top-4 right-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-950"></div>}
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`relative p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${theme === 'system'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-xl shadow-emerald-100 dark:shadow-none'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
              >
                <Monitor size={32} className={theme === 'system' ? 'text-emerald-600' : 'text-gray-400'} />
                <p className={`font-black uppercase tracking-widest text-xs ${theme === 'system' ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-500'}`}>Automático</p>
                {theme === 'system' && <div className="absolute top-4 right-4 w-4 h-4 bg-emerald-500 rounded-full border-4 border-white dark:border-gray-950"></div>}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Bell size={22} className="text-amber-500" />
              NOTIFICAÇÕES E ALERTAS
            </h2>
          </div>
          <div className="p-8 space-y-6">
            {[
              { key: 'email', label: 'Resumo Semanal por Email', description: 'Receba um relatório de performance toda segunda-feira.' },
              { key: 'proposals', label: 'Alertas de Propostas', description: 'Notificar quando um cliente visualizar ou aceitar um orçamento.' },
              { key: 'updates', label: 'Novidades do PrecificaPro', description: 'Fique por dentro das novas funcionalidades e melhorias.' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-3xl transition-all">
                <div className="flex-1 pr-4">
                  <p className="font-black text-gray-900 dark:text-white text-lg">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">{item.description}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 ${notifications[item.key as keyof typeof notifications]
                    ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700'
                    }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Data Security Section */}
        <div className="bg-white dark:bg-gray-900 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between">
            <h2 className="font-black text-gray-900 dark:text-white flex items-center gap-3">
              <Shield size={22} className="text-blue-500" />
              SEGURANÇA E EXPORTAÇÃO DE DADOS
            </h2>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-8">
            <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] border border-gray-100 dark:border-gray-800 flex flex-col gap-6">
              <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                <Download size={28} />
              </div>
              <div>
                <h4 className="font-black text-gray-900 dark:text-white text-lg mb-1">Exportar Base de Dados</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-6">Baixe todas as suas propostas, clientes e serviços em formato JSON.</p>
                <button className="w-full py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm">
                  Baixar Backup Completo
                </button>
              </div>
            </div>

            <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-[32px] border border-gray-100 dark:border-gray-800 flex flex-col gap-6">
              <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                <Upload size={28} />
              </div>
              <div>
                <h4 className="font-black text-gray-900 dark:text-white text-lg mb-1">Importar Dados</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-6">Restaure sua conta a partir de um arquivo de backup do PrecificaPro.</p>
                <button className="w-full py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm">
                  Selecionar Arquivo .json
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
