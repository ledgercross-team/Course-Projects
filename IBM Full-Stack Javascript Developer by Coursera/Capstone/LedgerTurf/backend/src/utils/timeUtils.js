/**
 * Formats a 24h time string (HH:mm) to 12h string (hh:mm AM/PM)
 */
exports.format12h = (time24) => {
  if (!time24) return '';
  let [hours, minutes] = time24.split(':');
  hours = parseInt(hours);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Parses a 12h time string back to 24h format for storage
 */
exports.parse12h = (time12) => {
  const [time, modifier] = time12.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

/**
 * Validates Bangladesh phone number
 */
exports.validateBDPhone = (phone) => {
  const regex = /^01[3-9]\d{8}$/;
  return regex.test(phone.trim());
};
