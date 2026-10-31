import ipaddr from 'ipaddr.js';

export function isGlobalUnicast(address: string): boolean {
  const normalized = address.trim().toLowerCase();
  if (!ipaddr.isValid(normalized)) return false;
  return ipaddr.parse(normalized).range() === 'unicast';
}
