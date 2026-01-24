
export type StatusRecibo = 'rascunho' | 'assinado' | 'cancelado';
export type TipoAssinatura = 'desenho' | 'texto' | 'upload';

export interface AssinaturaDigital {
  tipo: TipoAssinatura;
  dataAssinatura: Date;
  nomeAssinante: string;
  cpfAssinante: string;
  imagemAssinatura: string; // Base64
  ipAssinatura?: string;
  navegadorAssinatura?: string;
  hashDocumento: string;
}

export interface Recibo {
  id: string;
  numero: string;
  
  // Prestador (Quem recebe o dinheiro)
  prestadorId?: string;
  prestadorNome: string;
  prestadorCpfCnpj: string;
  prestadorEmail?: string;
  prestadorTelefone?: string;
  prestadorEndereco?: string;

  // Cliente (Quem paga)
  clienteId?: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteEndereco?: string;
  clienteEmail?: string;

  // Contexto
  projetoId?: string;
  projetoNome?: string;
  
  // Detalhes Financeiros
  dataEmissao: Date;
  dataServicoInicio: string;
  dataServicoFim: string;
  descricaoServico: string;
  observacoes?: string;
  valor: number;
  moeda: string;
  formaRecebimento?: string;

  // Status e Assinatura
  status: StatusRecibo;
  assinaturaPrestador?: AssinaturaDigital;
  
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ParametrosGeracaoRecibo {
  prestadorId?: string;
  prestadorNome: string;
  prestadorCpfCnpj: string;
  prestadorEmail?: string;
  prestadorTelefone?: string;
  prestadorEndereco?: string;
  clienteId?: string;
  clienteNome: string;
  clienteCpfCnpj: string;
  clienteEndereco?: string;
  clienteEmail?: string;
  projetoId?: string;
  projetoNome?: string;
  dataServicoInicio: string;
  dataServicoFim: string;
  descricaoServico: string;
  observacoes?: string;
  valor: number;
  moeda?: string;
  formaRecebimento?: string;
}

export interface ParametrosAssinatura {
  nomeAssinante: string;
  cpfAssinante: string;
  imagemAssinatura: string;
  tipoAssinatura?: TipoAssinatura;
  ipAssinatura?: string;
  navegadorAssinatura?: string;
}

export interface ResultadoValidacao {
  valido: boolean;
  erros: string[];
  avisos: string[];
}
