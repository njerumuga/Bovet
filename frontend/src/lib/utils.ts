export function formatKsh(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return 'KSh ' + num.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
}
