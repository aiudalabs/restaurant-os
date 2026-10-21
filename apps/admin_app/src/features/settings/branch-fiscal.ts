import type { Branch, BranchFiscal } from '@/types/branch';

const REQUIRED_TEXT: (keyof BranchFiscal)[] = [
  'branchCode',
  'billingPoint',
  'codUbi',
  'coords',
  'address',
  'city',
  'district',
  'state',
];

/** A branch can invoice when every text field of its fiscal block is filled. */
export function isBranchFiscalComplete(branch: Branch): boolean {
  const fiscal = branch.fiscal;
  if (!fiscal) return false;
  return REQUIRED_TEXT.every((k) => String(fiscal[k] ?? '').trim() !== '');
}
