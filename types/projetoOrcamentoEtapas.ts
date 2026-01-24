
export type PadraoObra = 'baixo' | 'medio' | 'alto';

export type NomeEtapaObra =
  | 'projeto_aprovacoes'
  | 'fundacoes'
  | 'estrutura'
  | 'alvenaria_vedacoes'
  | 'cobertura'
  | 'instalacao_hidraulica'
  | 'instalacao_eletrica'
  | 'impermeabilizacao'
  | 'esquadrias'
  | 'revestimentos_acabamentos'
  | 'pintura'
  | 'automacao'
  | 'servicos_complementares';

export interface ProjetoOrcamentoResumo {
  id: string;
  projetoId: string;
  valorEstimadoTotal: number;
  areaTotalM2: number;
  moeda: string;
  padrao?: PadraoObra;
  percentualTotal: number;
  valorTotalEtapas: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProjetoOrcamentoEtapa {
  id: string;
  projetoId: string;
  resumoId: string;
  nomeEtapa: NomeEtapaObra;
  label: string;
  percentualPrevisto: number;
  valorPrevisto: number;
  faixaPercentualMin?: number;
  faixaPercentualMax?: number;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface EtapaDefaultConfig {
  nomeEtapa: NomeEtapaObra;
  label: string;
  percentualSugerido: number;
  faixaPercentualMin?: number;
  faixaPercentualMax?: number;
}

export const ETAPAS_DEFAULT: EtapaDefaultConfig[] = [
  {
    nomeEtapa: 'projeto_aprovacoes',
    label: 'Projeto e aprovações',
    percentualSugerido: 5,
    faixaPercentualMin: 3,
    faixaPercentualMax: 8,
  },
  {
    nomeEtapa: 'fundacoes',
    label: 'Fundações / infraestrutura',
    percentualSugerido: 6,
    faixaPercentualMin: 3,
    faixaPercentualMax: 10,
  },
  {
    nomeEtapa: 'estrutura',
    label: 'Estrutura / superestrutura',
    percentualSugerido: 15,
    faixaPercentualMin: 10,
    faixaPercentualMax: 20,
  },
  {
    nomeEtapa: 'alvenaria_vedacoes',
    label: 'Alvenaria e vedações',
    percentualSugerido: 10,
    faixaPercentualMin: 7,
    faixaPercentualMax: 18,
  },
  {
    nomeEtapa: 'cobertura',
    label: 'Cobertura / telhado',
    percentualSugerido: 5,
    faixaPercentualMin: 3,
    faixaPercentualMax: 8,
  },
  {
    nomeEtapa: 'instalacao_hidraulica',
    label: 'Instalações hidráulicas',
    percentualSugerido: 9,
    faixaPercentualMin: 7,
    faixaPercentualMax: 12,
  },
  {
    nomeEtapa: 'instalacao_eletrica',
    label: 'Instalações elétricas',
    percentualSugerido: 5,
    faixaPercentualMin: 4,
    faixaPercentualMax: 7,
  },
  {
    nomeEtapa: 'impermeabilizacao',
    label: 'Impermeabilização',
    percentualSugerido: 3,
    faixaPercentualMin: 1,
    faixaPercentualMax: 4,
  },
  {
    nomeEtapa: 'esquadrias',
    label: 'Esquadrias (portas e janelas)',
    percentualSugerido: 6,
    faixaPercentualMin: 4,
    faixaPercentualMax: 10,
  },
  {
    nomeEtapa: 'revestimentos_acabamentos',
    label: 'Revestimentos e acabamentos',
    percentualSugerido: 25,
    faixaPercentualMin: 20,
    faixaPercentualMax: 35,
  },
  {
    nomeEtapa: 'pintura',
    label: 'Pintura',
    percentualSugerido: 7,
    faixaPercentualMin: 5,
    faixaPercentualMax: 9,
  },
  {
    nomeEtapa: 'automacao',
    label: 'Automação / redes / CFTV',
    percentualSugerido: 4,
    faixaPercentualMin: 2,
    faixaPercentualMax: 6,
  },
  {
    nomeEtapa: 'servicos_complementares',
    label: 'Serviços complementares / paisagismo',
    percentualSugerido: 6,
    faixaPercentualMin: 3,
    faixaPercentualMax: 8,
  },
];
