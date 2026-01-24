
import { CustoProjeto, ResumoCustosPorCategoria, ResumoCustosTotal, CategoriaCusto } from '../types/custosProjeto';

export function calcularResumoCustos(custos: CustoProjeto[], orcamentoPrevisto: number): ResumoCustosTotal {
  const categorias: Record<CategoriaCusto, ResumoCustosPorCategoria> = {
    mao_de_obra: { categoria: 'mao_de_obra', label: 'Mão de Obra', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
    material: { categoria: 'material', label: 'Materiais', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
    equipamento: { categoria: 'equipamento', label: 'Equipamentos', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
    servico: { categoria: 'servico', label: 'Serviços Terceirizados', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
    transporte: { categoria: 'transporte', label: 'Transporte', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
    outro: { categoria: 'outro', label: 'Outros', totalPlanejado: 0, totalReal: 0, quantidadeItens: 0, estouroBRL: 0, estouroPercentual: 0 },
  };

  custos.forEach(custo => {
    const cat = categorias[custo.categoria];
    cat.quantidadeItens++;
    cat.totalPlanejado += custo.custoTotal;
    if (custo.status === 'pago' || custo.status === 'confirmado') {
      cat.totalReal += custo.custoTotal;
    }
  });

  const porCategoria = Object.values(categorias).map(cat => {
    cat.estouroBRL = cat.totalReal - cat.totalPlanejado;
    cat.estouroPercentual = cat.totalPlanejado > 0 ? (cat.estouroBRL / cat.totalPlanejado) * 100 : 0;
    return cat;
  }).filter(c => c.quantidadeItens > 0);

  const totalPlanejado = porCategoria.reduce((acc, curr) => acc + curr.totalPlanejado, 0);
  const totalReal = porCategoria.reduce((acc, curr) => acc + curr.totalReal, 0);

  const estouroBRL = totalReal - totalPlanejado;
  const estouroPercentual = totalPlanejado > 0 ? (estouroBRL / totalPlanejado) * 100 : 0;

  return {
    projetoId: custos[0]?.projetoId || '',
    orcamentoPrevisto,
    custosPlanejados: totalPlanejado,
    custosReais: totalReal,
    margemPlanejada: orcamentoPrevisto - totalPlanejado,
    margemReal: orcamentoPrevisto - totalReal,
    estouroBRL,
    estouroPercentual,
    statusProjeto: estouroPercentual > 15 ? 'estouro' : estouroPercentual > 5 ? 'alerta' : 'ok',
    porCategoria
  };
}
