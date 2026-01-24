
export type CategoriaCusto = 
  | 'mao_de_obra'
  | 'material'
  | 'equipamento'
  | 'servico'
  | 'transporte'
  | 'outro';

export type StatusCusto = 'planejado' | 'confirmado' | 'pago' | 'cancelado';

export interface CustoProjeto {
  id: string;
  projetoId: string;
  descricao: string;
  categoria: CategoriaCusto;
  quantidade: number;
  unidade: string;
  custoUnitario: number;
  custoTotal: number;
  prestadorId?: string;
  prestadorNome?: string;
  dataLancamento: string;
  dataVencimento?: string;
  dataPagamento?: string;
  status: StatusCusto;
  observacoes?: string;
}

export interface ResumoCustosPorCategoria {
  categoria: CategoriaCusto;
  label: string;
  totalPlanejado: number;
  totalReal: number;
  quantidadeItens: number;
  estouroBRL: number;
  estouroPercentual: number;
}

export interface ResumoCustosTotal {
  projetoId: string;
  orcamentoPrevisto: number;
  custosPlanejados: number;
  custosReais: number;
  margemPlanejada: number;
  margemReal: number;
  estouroBRL: number;
  estouroPercentual: number;
  statusProjeto: 'ok' | 'alerta' | 'estouro';
  porCategoria: ResumoCustosPorCategoria[];
}
