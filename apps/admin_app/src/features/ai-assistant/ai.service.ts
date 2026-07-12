import { auth } from '@/lib/firebase';
import { BFF_URL } from '@/lib/config';

// Mirrors app/ai/models.py (snake_case over the wire).
export interface ProductRow {
  name: string;
  price: number;
  category: string;
  description?: string | null;
}
export interface MenuSpec {
  name: string;
  categories: string[];
}
export interface BuildPlan {
  summary: string;
  stations: string[];
  menu: MenuSpec | null;
  products: ProductRow[];
}
export interface PlanResponse {
  plan: BuildPlan;
  target_branch_id: string | null;
  target_branch_name: string | null;
  warnings: string[];
}
export interface ActionResult {
  kind: string;
  label: string;
  status: 'ok' | 'error' | 'skipped';
  detail: string;
}
export interface ApplyResponse {
  results: ActionResult[];
  created_menu_id: string | null;
  ok_count: number;
  error_count: number;
}

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado.');
  const token = await user.getIdToken();
  const res = await fetch(`${BFF_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Error ${res.status}`);
  }
  return res.json();
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export function requestPlan(
  message: string,
  branchId: string,
  csvRows: ProductRow[],
  history: ChatTurn[],
): Promise<PlanResponse> {
  return authedPost<PlanResponse>('/ai/plan', {
    message,
    branch_id: branchId || null,
    csv_rows: csvRows,
    history,
  });
}

export function applyPlan(plan: BuildPlan, branchId: string): Promise<ApplyResponse> {
  return authedPost<ApplyResponse>('/ai/apply', { plan, branch_id: branchId || null });
}

// --- CSV parsing (client-side, deterministic) -----------------------------
// Accepts flexible headers: name/nombre, price/precio, category/categoria,
// description/descripcion. A header row is required.
const HEADER_ALIASES: Record<keyof ProductRow, string[]> = {
  name: ['name', 'nombre', 'producto'],
  price: ['price', 'precio', 'costo'],
  category: ['category', 'categoria', 'categoría', 'grupo'],
  description: ['description', 'descripcion', 'descripción', 'detalle'],
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = !inQuotes;
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      out.push(cur); cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseCsv(text: string): { rows: ProductRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], error: 'El CSV necesita una fila de encabezados y al menos un producto.' };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const colIndex = (field: keyof ProductRow): number =>
    headers.findIndex((h) => HEADER_ALIASES[field].includes(h));

  const iName = colIndex('name');
  const iPrice = colIndex('price');
  const iCat = colIndex('category');
  const iDesc = colIndex('description');
  if (iName < 0) return { rows: [], error: 'No se encontró una columna de nombre (name/nombre).' };

  const rows: ProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = (cells[iName] ?? '').trim();
    if (!name) continue;
    const priceRaw = iPrice >= 0 ? (cells[iPrice] ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.') : '0';
    const price = parseFloat(priceRaw);
    rows.push({
      name,
      price: Number.isFinite(price) ? price : 0,
      category: iCat >= 0 ? (cells[iCat] ?? '').trim() : '',
      description: iDesc >= 0 ? (cells[iDesc] ?? '').trim() : '',
    });
  }
  return { rows };
}
