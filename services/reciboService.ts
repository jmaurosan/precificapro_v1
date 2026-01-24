
import {
  Recibo,
  ParametrosGeracaoRecibo,
  ParametrosAssinatura,
  ResultadoValidacao,
} from '../types/recibo';

export function gerarNumeroRecibo(): string {
  const ano = new Date().getFullYear();
  const numero = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `RECIBO-${ano}-${numero}`;
}

export async function calcularHashDocumento(texto: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    return 'hash-error-' + Date.now();
  }
}

export function formatarMoeda(valor: number, moeda: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor);
}

export function formatarData(data: Date | string): string {
  const dataObj = typeof data === 'string' ? new Date(data) : data;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dataObj);
}

export function formatarCpfCnpj(valor: string): string {
  const clean = valor.replace(/\D/g, '');
  if (clean.length === 11) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (clean.length === 14) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return valor;
}

export function criarRecibo(params: ParametrosGeracaoRecibo): Recibo {
  const agora = new Date();
  return {
    id: `rec-${Date.now()}`,
    numero: gerarNumeroRecibo(),
    ...params,
    dataEmissao: agora,
    status: 'rascunho',
    moeda: params.moeda || 'BRL',
    criadoEm: agora,
    atualizadoEm: agora,
  };
}

export async function adicionarAssinaturaPrestador(recibo: Recibo, params: ParametrosAssinatura): Promise<Recibo> {
  const textoIntegridade = `${recibo.numero}-${recibo.prestadorCpfCnpj}-${recibo.valor}`;
  const hash = await calcularHashDocumento(textoIntegridade);
  return {
    ...recibo,
    status: 'assinado',
    atualizadoEm: new Date(),
    assinaturaPrestador: {
      ...params,
      tipo: params.tipoAssinatura || 'desenho',
      dataAssinatura: new Date(),
      hashDocumento: hash,
    }
  };
}

export function gerarHTMLRecibo(recibo: Recibo): string {
  const valorFormatado = formatarMoeda(recibo.valor, recibo.moeda);
  const dataExtenso = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(recibo.dataEmissao);
  
  return `
    <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 8px; color: #333;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b66f5; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #3b66f5; font-size: 24px;">RECIBO DE PAGAMENTO</h1>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold;">Nº ${recibo.numero}</p>
          <p style="margin: 0; font-size: 14px; color: #666;">Valor: ${valorFormatado}</p>
        </div>
      </div>

      <div style="line-height: 1.8; font-size: 16px; margin-bottom: 40px; text-align: justify;">
        Recebi(emos) de <strong style="text-transform: uppercase;">${recibo.clienteNome}</strong>, 
        inscrito no CPF/CNPJ <strong style="text-transform: uppercase;">${formatarCpfCnpj(recibo.clienteCpfCnpj)}</strong>, 
        a importância supra de <strong>${valorFormatado}</strong> referente a:
        <br><br>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #3b66f5;">
          ${recibo.descricaoServico}
          ${recibo.projetoNome ? `<br><small style="color:#888;">Projeto: ${recibo.projetoNome}</small>` : ''}
        </div>
        <br>
        Pelo que firmo o presente para dar plena e geral quitação.
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <p>${recibo.prestadorEndereco || ''}</p>
        <p style="margin-bottom: 40px;">${dataExtenso}</p>
        
        <div style="display: inline-block; border-top: 1px solid #333; min-width: 300px; padding-top: 10px;">
          ${recibo.assinaturaPrestador ? `<img src="${recibo.assinaturaPrestador.imagemAssinatura}" style="max-height: 80px; margin-bottom: 10px;" /><br>` : ''}
          <strong style="text-transform: uppercase;">${recibo.prestadorNome}</strong><br>
          CPF/CNPJ: ${formatarCpfCnpj(recibo.prestadorCpfCnpj)}
        </div>
      </div>
      
      <div style="margin-top: 50px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px dashed #eee; padding-top: 20px;">
        Documento gerado pelo sistema PrecificaPro.
        ${recibo.assinaturaPrestador ? `<br>Autenticidade: ${recibo.assinaturaPrestador.hashDocumento}` : ''}
      </div>
    </div>
  `;
}
