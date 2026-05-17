/**
 * Formats 24h time to 12h AM/PM
 */
export const formatTime = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${minutes} ${ampm}`;
};

/**
 * Validates Bangladesh phone number
 */
export const validatePhone = (phone) => {
  return /^01[3-9]\d{8}$/.test(phone.trim());
};
