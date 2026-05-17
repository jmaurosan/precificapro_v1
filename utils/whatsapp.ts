export const createWhatsappLink = (phone: string | undefined, message: string) => {
  if (!phone) return '';

  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Only prepend country code if not already present
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${fullPhone}?text=${encodedMessage}`;
};
