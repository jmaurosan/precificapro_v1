export const formatCurrency = (value: number | string): string => {
  if (!value) return '';
  const numberValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove tudo que não é número ou vírgula
  const cleanValue = value.replace(/[^\d,]/g, '');
  // Troca vírgula por ponto para converter para float
  const dotValue = cleanValue.replace(',', '.');
  return parseFloat(dotValue);
};

export const formatInputCurrency = (value: string): string => {
  // Remove tudo que não for dígito
  const digits = value.replace(/\D/g, '');

  if (!digits) return '';

  // Converte para número e divide por 100 para ter os centavos
  const numberValue = parseInt(digits) / 100;

  // Formata
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
