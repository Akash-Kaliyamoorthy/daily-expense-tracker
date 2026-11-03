import client, { unwrap } from './client';

/** Every dashboard number for a month in one call. */
export const getSummary = (month) => unwrap(client.get(`/summary/${month}`));
export const getTrend = (months = 6) =>
  unwrap(client.get('/reports/trend', { params: { months } }));

/** Downloads the expenses in a date range as a CSV file. */
export async function downloadCsv(from, to) {
  const response = await client.get('/export/csv', {
    params: { from, to },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `expenses_${from}_to_${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
