
export * from './projetoOrcamentoEtapas';

export type TipoPessoa = 'PF' | 'PJ';
export type TipoImovel = 'apartamento' | 'casa' | 'comercial' | 'terreno';
export type SituacaoPosse = 'proprietario' | 'locatario';
export type StatusLead = 'novo' | 'em_briefing' | 'proposta_enviada' | 'contratado' | 'perdido';

export interface CompanyProfile {
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  website: string;
  logo: string | null;
  address: Endereco;
}

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'financial' | 'viewer';
export type OrganizationPlan = 'solo' | 'studio' | 'pro' | 'enterprise';
export type OrganizationStatus = 'active' | 'trialing' | 'past_due' | 'suspended' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  plan: OrganizationPlan;
  status: OrganizationStatus;
  role: OrganizationRole;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string;
  createdAt: Date;
  companyProfile?: CompanyProfile;
  organization?: Organization;
}

export interface PricingConfiguration {
  fixedCosts: number; // Custos Fixos Totais (R$)
  monthlyRevenue: number; // Faturamento Mensal Médio (R$)
  monthlyHoursCapacity: number; // Capacidade de Horas Produtivas/Mês
  taxRate: number; // Impostos (%)
  variableRate: number; // Custos Variáveis/Comissões (%)
  serviceMargin: number; // Margem para Serviços (%)
  materialMargin: number; // Margem para Materiais/Produtos (%)
}

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  quadra?: string;
  lote?: string;
}

export interface Client {
  id: string;
  tipo: TipoPessoa;
  nome: string;
  fantasia?: string;
  inscricaoEstadual?: string;
  nascimento?: string;
  cpfCnpj: string;
  email: string;
  telefones: { celular: string; whatsapp: string; };
  enderecoCorrespondencia?: Endereco;
  imovel: {
    tipo: TipoImovel;
    endereco: Endereco;
    metragemM2: number;
    situacaoPosse: SituacaoPosse;
    condominio?: { nome: string };
  };
  status: StatusLead;
  createdAt: Date;
  briefing?: {
    objetivo: string;
    estilo: string;
    prazo: string;
    tipoProjeto?: string;
    ambientes?: string[];
    orcamentoEstimado?: string;
    prioridade?: string;
    doresAtuais?: string;
    referencias?: string;
    observacoesComerciais?: string;
  };
  documentos?: DocumentoCliente[];
}

export type CategoriaDocumento =
  | 'alvaras_licencas'
  | 'contratos'
  | 'art_rrt'
  | 'projetos_executivos'
  | 'laudos_tecnicos'
  | 'certificados_garantia';

export type StatusValidade = 'valido' | 'proximo_vencimento' | 'vencido';

export interface DocumentoCliente {
  id: string;
  clienteId: string;
  categoria: CategoriaDocumento;
  nome: string;
  descricao?: string;
  arquivo: string; // base64
  tipoArquivo: string; // MIME type
  tamanhoBytes: number;
  dataUpload: string;
  dataValidade?: string;
  statusValidade?: StatusValidade;
}


// --- TIPOS DE QUALIDADE E VISTORIAS ---

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  items: string[];
}

export interface Inspection {
  id: string;
  projectId: string;
  templateId: string;
  templateName: string;
  date: string;
  responsible: string;
  status: 'approved' | 'approved_with_notes' | 'rejected';
  itemsChecked: string[]; // IDs or text of checked items
  photos: string[]; // base64
  comments?: string;
}

export interface NonConformity {
  id: string;
  projectId: string;
  inspectionId?: string; // Opcional (pode ser avulsa)
  description: string;
  photo?: string; // base64
  responsible: string; // Quem vai corrigir
  deadline: string;
  status: 'open' | 'in_progress' | 'resolved';
  reworkCost: number; // Custo do retrabalho
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  totalBudget: number;
  spentAmount: number;
  startDate: string;
  status: 'active' | 'completed' | 'on_hold';
  inspections?: Inspection[];
  nonConformities?: NonConformity[];
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  description: string;
  location: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  date: string;
  type: 'expense' | 'return';
  receiptImage?: string;
}

export interface Consignado {
  id: string;
  projectId: string;
  fornecedorNome: string;
  descricao: string;
  quantidade: number;
  valorUnitarioEstimado: number;
  dataEntrada: string;
  dataPrevisaoDevolucao: string;
  status: 'pendente' | 'devolvido' | 'comprado';
  observacoes?: string;
}

export interface Prestador {
  id: string;
  nome: string;
  tipoCadastro: TipoPessoa;
  cpfCnpj: string;
  ramoAtividade: string;
  categoriaProfissional: 'Autônomo' | 'Empresa/Equipe' | 'Parceiro Técnico';
  especialidades: string[];
  ferramentalProprio: boolean;
  disponibilidadeViagem: boolean;
  email: string;
  telefoneCelular: string;
  statusCadastro: 'aprovado' | 'em_analise' | 'reprovado';
  notaMedia: number;
  experienciaAnos?: number;
  observacoesInternas?: string;
}

export interface ContaPagar {
  id: string;
  prestadorId: string;
  prestadorNome: string;
  projetoId: string;
  projetoNome: string;
  descricao: string;
  valorTotal: number;
  dataVencimento: string;
  status: 'aberta' | 'paga' | 'atrasada';
  categoria: 'mao_de_obra' | 'material' | 'automacao' | 'projeto';
}
