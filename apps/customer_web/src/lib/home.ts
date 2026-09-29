// The restaurant this device orders from, remembered for good (localStorage) so a
// customer who orders every day opens the app — or the installed icon — and lands
// on their restaurant's menu without scanning the QR again (issue #49).

export interface HomeBranch {
  orgId: string;
  branchId: string;
  branchName: string;
  customerName: string;
}

const KEY = 'ros_customer_home';

export function saveHome(home: HomeBranch): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(home));
  } catch {
    /* private mode: the QR/link still works */
  }
}

export function loadHome(): HomeBranch | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Partial<HomeBranch>;
    if (!h.orgId || !h.branchId) return null;
    return { orgId: h.orgId, branchId: h.branchId, branchName: h.branchName ?? '', customerName: h.customerName ?? '' };
  } catch {
    return null;
  }
}
