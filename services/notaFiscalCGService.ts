
import { ParametrosConsultaNFCampoGrande, ResultadoConsultaNFCG } from '../types/notaFiscalCG';

const CONFIG_CG = {
  urlVerificacao: 'https://nfse.pmcg.ms.gov.br/NotaFiscal/verificarAutenticidade.php',
};

export async function consultarNFPrefeituraCG(params: ParametrosConsultaNFCampoGrande): Promise<ResultadoConsultaNFCG> {
  // Simulando a chamada à API da Prefeitura de Campo Grande
  // Em um ambiente real, este fetch seria feito para o endpoint da SEFIN CG
  try {
    // Simulação de delay de rede
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!params.numeroNota || !params.codigoVerificacao) {
      throw new Error("Dados incompletos para consulta.");
    }

    // Mock de retorno positivo para testes (caso o número da nota seja 2024)
    if (params.numeroNota === '2024') {
      return {
        encontrada: true,
        validada: true,
        mensagem: 'Nota Fiscal Autorizada encontrada na SEFIN Campo Grande.',
        numero: params.numeroNota,
        dataEmissao: new Date(),
        statusNF: 'ativa',
        prestadorNome: 'Mármores e Granitos CG Ltda',
        prestadorCnpj: params.cnpjPrestador || '00.000.000/0001-00',
        valorTotal: 1540.50,
        descricaoServicos: 'FORNECIMENTO E INSTALAÇÃO DE BANCADAS EM GRANITO PRETO SÃO GABRIEL',
        tipoSistema: params.tipo,
        dataConsulta: new Date()
      };
    }

    return {
      encontrada: false,
      validada: false,
      mensagem: 'Nota Fiscal não localizada nos registros de Campo Grande.',
      tipoSistema: params.tipo,
      dataConsulta: new Date()
    };

  } catch (error) {
    return {
      encontrada: false,
      validada: false,
      mensagem: `Erro na comunicação: ${error}`,
      tipoSistema: params.tipo,
      dataConsulta: new Date(),
      erros: [String(error)]
    };
  }
}
