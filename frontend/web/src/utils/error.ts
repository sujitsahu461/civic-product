export const getApiErrorMessage = (err: any, fallback = 'An unexpected error occurred.'): string => {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.error && typeof data.error === 'string') return data.error;
    if (Array.isArray(data) && data.length > 0) return String(data[0]);
    if (typeof data === 'object') {
      const messages: string[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val)) {
          messages.push(`${key}: ${val.join(', ')}`);
        } else if (typeof val === 'string') {
          messages.push(`${key}: ${val}`);
        } else if (typeof val === 'object' && val !== null) {
          messages.push(`${key}: ${JSON.stringify(val)}`);
        }
      }
      if (messages.length > 0) return messages.join(' | ');
    }
  }
  return err?.message || fallback;
};
