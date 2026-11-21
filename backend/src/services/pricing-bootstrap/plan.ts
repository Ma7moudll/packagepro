import rates from './egp-rates.json';
export { rates };
export type RateRow = { code: string; name: string; unitPrice: unknown; currency: string; isActive: boolean; metadata: unknown };
export function planEgpBootstrap(rows: RateRow[]) {
  const insert: typeof rates = [], migrate: typeof rates = [];
  const preserve: string[] = [], conflicts: string[] = [];
  for (const rate of rates) {
    const row = rows.find((r) => r.code === rate.code);
    if (!row) {
      if (rows.some((r) => r.name === rate.name)) conflicts.push(rate.code);
      else insert.push(rate);
    } else if (row.currency === 'EGP') preserve.push(row.code);
    else if (row.currency === 'USD' && row.name === rate.name && Number(row.unitPrice) === rate.legacyUsd && (row.metadata as any)?.source === 'seed') migrate.push(rate);
    else if (row.isActive) conflicts.push(row.code);
    else preserve.push(row.code);
  }
  for (const row of rows) if (row.isActive && row.currency !== 'EGP' && !rates.some((r) => r.code === row.code)) conflicts.push(row.code);
  return {insert, migrate, preserve, conflicts};
}
