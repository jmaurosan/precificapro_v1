import { AlertTriangle, CheckCircle2, FileText, LoaderCircle, Printer, ShieldCheck } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface PublicProposalItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  category: 'product' | 'service';
}

interface PublicProposal {
  id: string;
  proposalNumber: string;
  proposalDate: string;
  client: string;
  projectName: string;
  total: number;
  status: 'sent' | 'approved';
  notes: {
    notes?: string;
    paymentTerms?: string;
    deliveryTerms?: string;
    validityDays?: number;
    acceptedAt?: string;
    acceptedBy?: string;
    acceptanceMethod?: string;
    acceptanceNotes?: string;
  };
  items: PublicProposalItem[];
  office: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    cnpj?: string;
    logo?: string | null;
    address?: any;
  };
}

const PublicProposalPage: React.FC = () => {
  const { token } = useParams();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const viewedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    fetchProposal();
  }, [token]);

  const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const fetchProposal = async () => {
    if (!token) {
      setProposal(null);
      setMessage({ type: 'error', text: 'Link da proposta incompleto.' });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.rpc('get_public_proposal', { proposal_token: token }),
        20000,
        'Tempo esgotado ao carregar a proposta. Recarregue a pagina ou solicite um novo link.'
      );

      if (error || !data) {
        setProposal(null);
        setMessage({
          type: 'error',
          text: error?.message || 'Proposta nao encontrada ou link indisponivel.'
        });
        return;
      }

      setProposal(data as PublicProposal);
      setSignerName((data as PublicProposal).client || '');
      if (viewedTokenRef.current !== token) {
        viewedTokenRef.current = token;
        recordPublicEvent('public_viewed', 'Proposta visualizada pelo cliente', 'Link publico aberto pelo cliente.');
      }
    } catch (error: any) {
      setProposal(null);
      setMessage({
        type: 'error',
        text: error?.message || 'Nao foi possivel carregar a proposta.'
      });
    } finally {
      setLoading(false);
    }
  };

  const recordPublicEvent = async (eventType: string, title: string, details?: string, metadata: Record<string, any> = {}) => {
    if (!token) return;

    try {
      const { error } = await withTimeout(
        supabase.rpc('record_public_proposal_event', {
          proposal_token: token,
          event_type_to_record: eventType,
          event_title: title,
          event_details: details || null,
          event_metadata: metadata
        }),
        6000,
        'Tempo esgotado ao registrar evento publico.'
      );

      if (error) {
        console.warn('Could not record public proposal event:', error.message);
      }
    } catch (error: any) {
      console.warn('Could not record public proposal event:', error?.message || error);
    }
  };

  const subtotal = useMemo(() => {
    return proposal?.items.reduce((acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0) || 0;
  }, [proposal]);

  const validUntil = useMemo(() => {
    if (!proposal?.proposalDate) return '';
    const date = new Date(`${proposal.proposalDate}T00:00:00`);
    date.setDate(date.getDate() + Number(proposal.notes?.validityDays || 15));
    return date.toLocaleDateString('pt-BR');
  }, [proposal]);

  const officeAddress = useMemo(() => {
    const address = proposal?.office?.address || {};
    return [address.logradouro, address.numero, address.bairro, address.cidade, address.uf]
      .filter(Boolean)
      .join(', ');
  }, [proposal]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async () => {
    if (!token || !proposal) return;

    if (!signerName.trim()) {
      setMessage({ type: 'error', text: 'Informe o nome de quem esta aprovando a proposta.' });
      return;
    }

    setApproving(true);
    const { data, error } = await supabase.rpc('approve_public_proposal', {
      proposal_token: token,
      signer_name: signerName.trim(),
      signer_email: signerEmail.trim() || null,
      acceptance_notes: acceptanceNotes.trim() || null
    });

    if (error || !data?.ok) {
      setMessage({ type: 'error', text: error?.message || data?.message || 'Nao foi possivel aprovar a proposta.' });
    } else {
      await recordPublicEvent(
        'accepted_public',
        'Proposta aprovada pelo cliente',
        signerEmail.trim() ? `Aceite informado por ${signerName.trim()} (${signerEmail.trim()}).` : `Aceite informado por ${signerName.trim()}.`,
        { signerName: signerName.trim(), signerEmail: signerEmail.trim() || null }
      );
      setMessage({ type: 'success', text: 'Proposta aprovada com sucesso. O escritorio ja pode dar sequencia ao projeto.' });
      await fetchProposal();
    }

    setApproving(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 font-black text-teal-300">
          <LoaderCircle className="animate-spin" size={22} />
          Carregando proposta...
        </div>
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg rounded-[32px] border border-rose-900/60 bg-rose-950/20 p-8 text-center">
          <AlertTriangle className="mx-auto text-rose-300" size={36} />
          <h1 className="mt-5 text-2xl font-black">Link indisponivel</h1>
          <p className="mt-3 text-slate-300">{message?.text || 'Nao encontramos uma proposta ativa para este link.'}</p>
        </div>
      </main>
    );
  }

  const isApproved = proposal.status === 'approved' || Boolean(proposal.notes?.acceptedAt);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 px-6 py-8 print:bg-white print:text-slate-950">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-6 rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur md:flex-row md:items-start md:justify-between print:border-slate-200 print:bg-white print:shadow-none">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-teal-500/20 text-2xl font-black text-teal-200">
                {proposal.office.logo ? <img src={proposal.office.logo} alt="" className="h-full w-full object-contain p-2" /> : (proposal.office.name || 'P').charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-300">Proposta comercial</p>
                <h1 className="mt-2 text-3xl font-black text-white print:text-slate-950">{proposal.office.name || 'Escritorio'}</h1>
                <p className="mt-2 max-w-xl text-sm text-slate-300 print:text-slate-600">{officeAddress || 'Endereco nao informado'}</p>
                <p className="text-sm text-slate-300 print:text-slate-600">{proposal.office.email || ''}{proposal.office.phone ? ` | ${proposal.office.phone}` : ''}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-left md:text-right print:border-slate-200 print:bg-slate-50">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Proposta #{proposal.proposalNumber}</p>
              <p className="mt-2 text-sm text-slate-300 print:text-slate-600">Emissao: {formatDate(proposal.proposalDate)}</p>
              <p className="text-sm text-slate-300 print:text-slate-600">Validade: {validUntil}</p>
              <span className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase tracking-widest ${isApproved ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {isApproved ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                {isApproved ? 'Aprovada' : 'Aguardando aceite'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-12 print:px-0">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 print:border-slate-200 print:bg-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Cliente</p>
              <h2 className="mt-2 text-3xl font-black text-white print:text-slate-950">{proposal.client}</h2>
              <p className="mt-2 text-slate-300 print:text-slate-600">Projeto: {proposal.projectName || 'Geral'}</p>
            </div>

            <div className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 print:border-slate-200 print:bg-white">
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-teal-300">Escopo contratado</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 print:border-slate-200">
                {proposal.items.map((item) => (
                  <div key={item.id} className="grid gap-3 border-b border-slate-800 p-4 last:border-b-0 md:grid-cols-[1fr_110px_130px] print:border-slate-200">
                    <div>
                      <p className="font-black text-white print:text-slate-950">{item.description}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">{item.category === 'service' ? 'Servico' : 'Produto'} | {item.unit}</p>
                    </div>
                    <p className="font-bold text-slate-300 print:text-slate-600">Qtd. {Number(item.quantity).toLocaleString('pt-BR')}</p>
                    <p className="text-right font-black text-white print:text-slate-950">{formatCurrency(Number(item.quantity) * Number(item.unitPrice))}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 print:border-slate-200 print:bg-white">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Pagamento</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 print:text-slate-700">{proposal.notes?.paymentTerms || 'A combinar.'}</p>
              </div>
              <div className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 print:border-slate-200 print:bg-white">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Prazos e premissas</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 print:text-slate-700">{proposal.notes?.deliveryTerms || 'Prazos sujeitos a alinhamento tecnico.'}</p>
              </div>
            </div>

            {proposal.notes?.notes && (
              <div className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 print:border-slate-200 print:bg-white">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Observacoes</h3>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-300 print:text-slate-700">{proposal.notes.notes}</p>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="sticky top-6 rounded-[32px] border border-teal-500/30 bg-slate-900 p-6 shadow-2xl print:static print:border-slate-200 print:bg-white print:shadow-none">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-300">Resumo</p>
              <div className="mt-5 space-y-3 border-b border-slate-800 pb-5 print:border-slate-200">
                <div className="flex justify-between gap-4 text-sm text-slate-300 print:text-slate-600">
                  <span>Subtotal</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>
                <div className="flex justify-between gap-4 text-sm text-slate-300 print:text-slate-600">
                  <span>Ajustes</span>
                  <strong>{formatCurrency(Number(proposal.total || 0) - subtotal)}</strong>
                </div>
              </div>
              <div className="mt-5 flex justify-between gap-4">
                <span className="text-sm font-black uppercase tracking-widest text-slate-400">Total</span>
                <strong className="text-2xl font-black text-white print:text-slate-950">{formatCurrency(Number(proposal.total || 0))}</strong>
              </div>

              {isApproved ? (
                <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-200 print:border-emerald-200 print:bg-emerald-50 print:text-emerald-700">
                  <div className="flex items-center gap-2 font-black">
                    <ShieldCheck size={18} />
                    Proposta aprovada
                  </div>
                  <p className="mt-2 text-sm">Aceite registrado {proposal.notes?.acceptedAt ? `em ${formatDateTime(proposal.notes.acceptedAt)}` : 'com sucesso'}.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Nome de quem aprova"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-white outline-none focus:border-teal-400 print:border-slate-300 print:bg-white print:text-slate-950"
                  />
                  <input
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="E-mail para registro"
                    type="email"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-white outline-none focus:border-teal-400 print:border-slate-300 print:bg-white print:text-slate-950"
                  />
                  <textarea
                    value={acceptanceNotes}
                    onChange={(e) => setAcceptanceNotes(e.target.value)}
                    placeholder="Observacao opcional"
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-white outline-none focus:border-teal-400 print:border-slate-300 print:bg-white print:text-slate-950"
                  />
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
                  >
                    {approving ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    Aprovar proposta
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-4 text-sm font-black uppercase tracking-widest text-slate-200 transition hover:border-teal-400 hover:text-teal-300 print:hidden"
              >
                <Printer size={18} />
                Imprimir / PDF
              </button>

              {message && (
                <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${message.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/30 bg-rose-500/10 text-rose-200'}`}>
                  {message.text}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

export default PublicProposalPage;
