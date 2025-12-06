const DEFAULT_HW_CODES: Record<string, string> = {
  laptop: 'NB',
  notebook: 'NB',
  smartphone: 'SP',
  handy: 'SP',
  tablet: 'TB',
  monitor: 'MN',
  display: 'MN',
  'desktop-pc': 'DT',
  desktop: 'DT',
  pc: 'DT',
};

export function deriveHardwareCode(hwName?: string | null): string {
  if (!hwName) {
    return 'HW';
  }

  const normalized = hwName.toLowerCase();
  for (const [keyword, code] of Object.entries(DEFAULT_HW_CODES)) {
    if (normalized.includes(keyword)) {
      return code;
    }
  }

  const initials = hwName
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');

  return (initials.slice(0, 3) || 'HW').padEnd(2, 'H');
}

export function formatInventarCode(prefix: string, sequence: number): string {
  const sanitizedPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'HW';
  return `${sanitizedPrefix}-${String(sequence).padStart(4, '0')}`;
}
