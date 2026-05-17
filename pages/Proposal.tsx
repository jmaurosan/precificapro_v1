import { ArrowLeft, MessageCircle, Printer, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { createWhatsappLink } from '../utils/whatsapp';

interface CompanySettings {
  companyName: string;
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

const Proposal: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    items,
    phases,
    total,
    clientName,
    projectName,
    type,
    suggestedPrice
  } = location.state || {}; // Recebe dados da Calculadora

  useEffect(() => {
    const storedSettings = localStorage.getItem('precificaPro_settings');
    if (storedSettings) {
      setCompanySettings(JSON.parse(storedSettings));
    }
  }, []);

  const handleSaveProposal = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const finalValue = type === 'project' ? suggestedPrice : total;

    // Preparar itens para salvar no formato JSONB ou relacional
    // Aqui assumimos que a coluna 'items' aceita JSONB
    const proposalItems = type === 'project'
      ? phases.map((p: any) => ({ description: p.name, quantity: p.hours, unitPrice: (finalValue / phases.reduce((acc: number, i: any) => acc + i.hours, 0)), category: 'service' }))
      : items.map((i: any) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitCost, category: i.type }));

    try {
      const { error } = await supabase.from('proposals').insert({
        user_id: user?.id,
        project_id: null, // Poderíamos passar o ID se viesse do state
        proposal_number: `${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`,
        proposal_date: new Date().toISOString().split('T')[0],
        client_name: clientName || 'Cliente sem Nome',
        total_amount: finalValue,
        status: 'draft',
        items: proposalItems
      });

      if (error) throw error;
      alert('Proposta salva com sucesso!');
      navigate('/proposals');
    } catch (err: any) {
      alert('Erro ao salvar proposta: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!location.state) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 mb-4">Nenhum dado de proposta encontrado.</p>
        <button onClick={() => navigate('/calculator')} className="text-teal-600 font-bold hover:underline">Voltar para Calculadora</button>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('pt-BR');
  const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'); // +15 dias
  const finalValue = type === 'project' ? suggestedPrice : total;

  // Mock Phone Number for Demo - In real app, get from Client Data
  const clientPhone = '11999999999';

  const whatsappMessage = `Olá ${clientName}, segue a proposta comercial referente ao projeto *${projectName}*.\n\nValor do Investimento: *R$ ${finalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\nPodemos agendar uma conversa para apresentar os detalhes?`;
  const whatsappLink = createWhatsappLink(clientPhone, whatsappMessage);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8 print:p-0 print:bg-white overflow-auto flex justify-center items-start">

      {/* Botões de Ação Flutuantes (Não aparecem na impressão) */}
      <div className="fixed top-8 right-8 flex flex-col gap-3 print:hidden z-50">
        <button onClick={() => navigate('/calculator')} className="bg-white/90 backdrop-blur text-gray-700 p-4 rounded-full shadow-lg hover:scale-110 transition-all border border-gray-200" title="Voltar">
          <ArrowLeft size={20} />
        </button>
        <button onClick={handleSaveProposal} disabled={isSaving} className="bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:scale-110 transition-all disabled:opacity-50" title="Salvar no Sistema">
          <Save size={20} />
        </button>
        <button onClick={() => window.open(whatsappLink, '_blank')} className="bg-emerald-500 text-white p-4 rounded-full shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-110 transition-all" title="Enviar via WhatsApp">
          <MessageCircle size={20} />
        </button>
        <button onClick={() => window.print()} className="bg-teal-600 text-white p-4 rounded-full shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:scale-110 transition-all" title="Imprimir / Salvar PDF">
          <Printer size={20} />
        </button>
      </div>

      {/* Folha A4 */}
      <div className="bg-white w-[210mm] min-h-[297mm] mx-auto shadow-2xl print:shadow-none print:w-full print:mx-0 p-[15mm] md:p-[20mm] relative text-gray-800">

        {/* Cabeçalho */}
        <header className="flex justify-between items-start border-b-2 border-teal-900/10 pb-8 mb-12">
          <div className="flex flex-col gap-4">
            {companySettings?.logo ? (
              <img src={companySettings.logo} alt="Logo" className="h-16 w-auto object-contain object-left" />
            ) : (
              <h1 className="text-3xl font-black text-teal-900 tracking-tighter uppercase">{companySettings?.companyName || 'Seu Escritório'}</h1>
            )}
            <div className="text-sm text-gray-500 space-y-0.5 font-medium">
              <p>{companySettings?.address || 'Endereço da Empresa'}</p>
              <p>{companySettings?.email} • {companySettings?.phone}</p>
              <p className="text-xs text-gray-400">CNPJ: {companySettings?.cnpj || '00.000.000/0001-00'}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-5xl font-black text-gray-100 uppercase tracking-tighter loading-none">Proposta</h2>
            <p className="text-teal-600 font-bold text-lg -mt-4 relative z-10">Comercial</p>
            <div className="mt-4 text-sm font-medium text-gray-500">
              <p>Emissão: {currentDate}</p>
              <p>Validade: {validUntil}</p>
              <p className="mt-2 text-xs bg-teal-50 text-teal-700 inline-block px-2 py-1 rounded">Ref: {projectName || 'Projeto'}</p>
            </div>
          </div>
        </header>

        {/* Cliente */}
        <section className="mb-12 bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-4">Dados do Cliente</h3>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Cliente</p>
              <p className="text-xl font-bold text-gray-900">{clientName || 'Cliente não identificado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Projeto / Obra</p>
              <p className="text-xl font-bold text-gray-900">{projectName || 'Geral'}</p>
            </div>
          </div>
        </section>

        {/* Corpo da Proposta: Projeto ou Obra */}
        <section className="mb-12">
          <h3 className="text-xs font-black text-teal-400 uppercase tracking-widest mb-6">Escopo dos Serviços</h3>

          {type === 'project' ? (
            // Tabela de Fases de Projeto
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Fase / Etapa</th>
                    <th className="px-6 py-4 text-center">Horas Est.</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {phases?.map((phase: any, index: number) => {
                    // Proporcionalizando o valor total pelas horas de cada fase para exibir na proposta
                    const totalHours = phases.reduce((acc: number, p: any) => acc + p.hours, 0);
                    const phaseValue = (phase.hours / totalHours) * (suggestedPrice || 0);

                    return (
                      <tr key={index} className="text-sm hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{phase.name}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{phase.hours}h</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">R$ {phaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            // Tabela de Itens de Obra
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-gray-600 font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Item / Serviço</th>
                    <th className="px-6 py-4 text-center">Tipo</th>
                    <th className="px-6 py-4 text-center">Qtd.</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items?.map((item: any, index: number) => {
                    const itemTotal = item.quantity * item.unitCost * (1 + item.profitMargin / 100);
                    return (
                      <tr key={index} className="text-sm hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${item.type === 'service' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.type === 'service' ? 'Serviço' : 'Material'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">R$ {itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Total */}
        <section className="flex justify-end mb-16">
          <div className="w-1/2 bg-teal-900 text-white p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
            <p className="text-teal-200 text-xs font-bold uppercase tracking-widest mb-2">Valor Total do Investimento</p>
            <p className="text-4xl font-black tracking-tighter">R$ {(type === 'project' ? suggestedPrice : total)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-teal-300 text-xs mt-2 border-t border-white/20 pt-2">Condições de pagamento a combinar.</p>
          </div>
        </section>

        {/* Rodapé e Termos */}
        <footer className="mt-auto border-t-2 border-gray-100 pt-8 text-center text-gray-400 text-xs">
          <div className="grid grid-cols-2 gap-12 mb-12 text-left">
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Termos e Condições</h4>
              <p className="leading-relaxed">Esta proposta é válida por 15 dias a partir da data de emissão. Os serviços serão executados conforme cronograma acordado após a aprovação deste orçamento.</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2">Aprovação</h4>
              <div className="border-b border-gray-300 h-12 w-full mt-8"></div>
              <p className="mt-2">Assinatura do Cliente</p>
            </div>
          </div>

          <p className="font-medium">Gerado por PrecificaPro System • {currentDate}</p>
        </footer>

      </div>
    </div>
  );
};

export default Proposal;
