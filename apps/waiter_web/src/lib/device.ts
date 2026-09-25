// The branch this device is set up for. It arrives once through the link the
// admin shares (?branch=…) and is remembered, so waiters only pick their name
// and type their PIN. Also preselects that branch in the workspace.
const DEVICE_KEY = 'waiter_device_branch';
const WORKSPACE_KEY = 'waiter_branch';

function read(): string {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? '';
  } catch {
    return '';
  }
}

function write(id: string) {
  try {
    if (id) {
      localStorage.setItem(DEVICE_KEY, id);
      localStorage.setItem(WORKSPACE_KEY, id);
    } else {
      localStorage.removeItem(DEVICE_KEY);
    }
  } catch {
    /* per-device convenience only */
  }
}

/** Takes ?branch=… from the address bar (once), else the remembered one. */
export function initialDeviceBranch(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('branch');
  if (fromUrl) {
    write(fromUrl);
    window.history.replaceState({}, '', window.location.pathname);
    return fromUrl;
  }
  return read();
}

export function forgetDeviceBranch() {
  write('');
}
