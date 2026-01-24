export const createWhatsappLink = (phone: string | undefined, message: string) => {
  if (!phone) return '';

  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
};
