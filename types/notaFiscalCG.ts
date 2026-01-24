
export type TipoSistemaFS = 'sistema_antigo' | 'sistema_nacional' | 'rps';

export interface ParametrosConsultaNFCampoGrande {
  tipo: TipoSistemaFS;
  cnpjPrestador?: string;
  codigoVerificacao?: string;
  numeroNota?: string;
  inscricaoMunicipal?: string;
  chaveNFS?: string;
  numeroRPS?: string;
  serieRPS?: string;
}

export interface ResultadoConsultaNFCG {
  encontrada: boolean;
  validada: boolean;
  mensagem: string;
  numero?: string;
  serie?: string;
  dataEmissao?: Date;
  statusNF?: 'ativa' | 'cancelada' | 'substituida';
  prestadorNome?: string;
  prestadorCnpj?: string;
  prestadorInscricaoMunicipal?: string;
  valorTotal?: number;
  descricaoServicos?: string;
  tipoSistema: TipoSistemaFS;
  dataConsulta: Date;
  erros?: string[];
}
