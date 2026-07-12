import { useRef, useState, useEffect } from 'react';
import { Sparkles, Paperclip, Send, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranchContext } from '@/hooks/use-branch-context';
import {
  requestPlan, applyPlan, parseCsv,
  type BuildPlan, type ProductRow, type ActionResult, type ChatTurn,
} from './ai.service';

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  type: 'text' | 'plan' | 'results' | 'error';
  text?: string;
  plan?: BuildPlan;
  branchId?: string;
  warnings?: string[];
  results?: ActionResult[];
  okCount?: number;
  errCount?: number;
  done?: boolean; // plan already applied/discarded
}

const SUGGESTIONS = [
  'Créame dos estaciones: Cocina y Bar',
  "Crea un menú 'Carta' con categorías Entradas, Platos fuertes y Postres",
  'Agrega una Pizza Margarita a 8.50 en la categoría Pizzas',
];

let _id = 1;
const nextId = () => _id++;

// Condense the visible conversation into turns the model can reason over.
function buildHistory(msgs: Msg[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of msgs) {
    if (m.role === 'user' && m.text) {
      turns.push({ role: 'user', text: m.text });
    } else if (m.type === 'plan' && m.plan) {
      turns.push({ role: 'assistant', text: m.plan.summary || 'Propuse un plan.' });
    } else if (m.type === 'results' && m.results) {
      const created = m.results.filter((r) => r.status === 'ok').map((r) => r.label);
      if (created.length) turns.push({ role: 'assistant', text: `Ya creé: ${created.join('; ')}.` });
    }
  }
  return turns.slice(-12); // keep the prompt small
}

export default function AiAssistantPage() {
  const { selectedBranch } = useBranchContext();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [csv, setCsv] = useState<{ rows: ProductRow[]; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const push = (m: Omit<Msg, 'id'>) => setMessages((prev) => [...prev, { ...m, id: nextId() }]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const branchId = selectedBranch?.id ?? '';
    const attachedCsv = csv;
    const userText = attachedCsv ? `${text}\n\n📎 ${attachedCsv.name} (${attachedCsv.rows.length} productos)` : text;
    const history = buildHistory(messages);
    push({ role: 'user', type: 'text', text: userText });
    setInput('');
    setCsv(null);
    setSending(true);
    try {
      const res = await requestPlan(text, branchId, attachedCsv?.rows ?? [], history);
      push({
        role: 'assistant', type: 'plan', plan: res.plan,
        branchId: res.target_branch_id ?? branchId, warnings: res.warnings,
      });
    } catch (e) {
      push({ role: 'assistant', type: 'error', text: e instanceof Error ? e.message : 'Error inesperado.' });
    } finally {
      setSending(false);
    }
  };

  const confirmPlan = async (msg: Msg) => {
    if (!msg.plan) return;
    setApplyingId(msg.id);
    try {
      const res = await applyPlan(msg.plan, msg.branchId ?? '');
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, done: true } : m)));
      push({
        role: 'assistant', type: 'results', results: res.results,
        okCount: res.ok_count, errCount: res.error_count,
      });
    } catch (e) {
      push({ role: 'assistant', type: 'error', text: e instanceof Error ? e.message : 'No se pudo aplicar.' });
    } finally {
      setApplyingId(null);
    }
  };

  const discard = (id: number) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, done: true } : m)));

  const onFile = async (file: File) => {
    const text = await file.text();
    const { rows, error } = parseCsv(text);
    if (error) { push({ role: 'assistant', type: 'error', text: error }); return; }
    setCsv({ rows, name: file.name });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-600 text-white">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-on-surface)]">Asistente IA</h1>
          <p className="text-sm text-[var(--color-on-surface-variant)]">
            Describe lo que quieres y lo armo en{' '}
            <span className="font-semibold">{selectedBranch?.name ?? 'tu sucursal'}</span>. Confirmas antes de crear.
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-[var(--color-surface-container-low)] p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--color-primary-container)] text-orange-700">
              <Sparkles size={30} />
            </div>
            <p className="mt-4 max-w-sm text-[var(--color-on-surface-variant)]">
              Pídeme crear estaciones, menús, categorías o productos. Puedes adjuntar un CSV de productos.
            </p>
            <div className="mt-5 flex flex-col items-stretch gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="m3-state rounded-full border border-[var(--color-outline-variant)] px-4 py-2 text-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            msg={m}
            applying={applyingId === m.id}
            onConfirm={() => confirmPlan(m)}
            onDiscard={() => discard(m.id)}
          />
        ))}

        {sending && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
            <Loader2 size={16} className="animate-spin" /> Pensando el plan…
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pt-3">
        {csv && (
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-container)] px-3 py-1 text-orange-800">
              <Paperclip size={14} /> {csv.name} · {csv.rows.length} productos
              <button onClick={() => setCsv(null)} className="ml-1"><X size={14} /></button>
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-3xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)] p-2">
          <input
            ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="Adjuntar CSV de productos"
            className="m3-state grid h-11 w-11 flex-shrink-0 place-items-center rounded-full text-[var(--color-on-surface-variant)]"
          >
            <Paperclip size={20} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Ej: crea Cocina y Bar, y un menú Carta con Pizzas y Bebidas…"
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-[var(--color-on-surface)] outline-none placeholder:text-[var(--color-on-surface-variant)]"
          />
          <Button onClick={send} disabled={!input.trim() || sending} size="md" className="!h-11 !w-11 !px-0">
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg, applying, onConfirm, onDiscard,
}: { msg: Msg; applying: boolean; onConfirm: () => void; onDiscard: () => void }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-orange-600 px-4 py-2.5 text-sm text-white">
          {msg.text}
        </div>
      </div>
    );
  }

  if (msg.type === 'error') {
    return (
      <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {msg.text}
      </div>
    );
  }

  if (msg.type === 'plan' && msg.plan) {
    const p = msg.plan;
    const nProducts = p.products.length;
    const categories = p.menu?.categories ?? [];
    return (
      <div className="max-w-[92%] rounded-3xl rounded-bl-lg bg-[var(--color-surface-container-high)] p-4">
        <p className="text-sm font-medium text-[var(--color-on-surface)]">{p.summary || 'Esto es lo que voy a crear:'}</p>
        <div className="mt-3 space-y-2 text-sm">
          {p.stations.length > 0 && (
            <PlanRow label="Estaciones" items={p.stations} />
          )}
          {p.menu && (
            <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2">
              <span className="text-[var(--color-on-surface-variant)]">Menú: </span>
              <span className="font-semibold">{p.menu.name}</span>
              {categories.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span key={c} className="rounded-full bg-[var(--color-primary-container)] px-2.5 py-0.5 text-xs text-orange-800">{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          {nProducts > 0 && (
            <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2">
              <span className="text-[var(--color-on-surface-variant)]">Productos: </span>
              <span className="font-semibold">{nProducts}</span>
              <div className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                {p.products.slice(0, 4).map((x) => `${x.name} ($${x.price.toFixed(2)})`).join(' · ')}
                {nProducts > 4 && ` … +${nProducts - 4} más`}
              </div>
            </div>
          )}
          {p.tables && p.tables.count > 0 && (
            <PlanRow
              label="Mesas"
              items={[
                `${p.tables.count} mesa(s) · ${p.tables.capacity} personas` +
                  (p.tables.zone ? ` · ${p.tables.zone}` : ''),
              ]}
            />
          )}
        </div>

        {msg.warnings && msg.warnings.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
            {msg.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
          </ul>
        )}

        {!msg.done ? (
          <div className="mt-4 flex gap-2">
            <Button onClick={onConfirm} disabled={applying} size="sm">
              {applying ? <><Loader2 size={15} className="animate-spin" /> Creando…</> : <><Check size={15} /> Confirmar y crear</>}
            </Button>
            <Button onClick={onDiscard} disabled={applying} variant="ghost" size="sm">Descartar</Button>
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-[var(--color-on-surface-variant)]">Plan cerrado.</p>
        )}
      </div>
    );
  }

  if (msg.type === 'results' && msg.results) {
    return (
      <div className="max-w-[92%] rounded-3xl rounded-bl-lg bg-[var(--color-surface-container-high)] p-4">
        <p className="text-sm font-bold text-[var(--color-on-surface)]">
          {msg.errCount ? `Creado con ${msg.errCount} error(es)` : '¡Listo! Todo creado'} · {msg.okCount} ✓
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          {msg.results.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              {r.status === 'ok'
                ? <Check size={15} className="mt-0.5 flex-shrink-0 text-green-600" />
                : <X size={15} className="mt-0.5 flex-shrink-0 text-red-600" />}
              <span className={r.status === 'ok' ? 'text-[var(--color-on-surface)]' : 'text-red-700'}>
                {r.label}{r.detail && r.status !== 'ok' ? ` — ${r.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <div className="text-sm text-[var(--color-on-surface)]">{msg.text}</div>;
}

function PlanRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] px-3 py-2">
      <span className="text-[var(--color-on-surface-variant)]">{label}: </span>
      <span className="font-semibold">{items.join(', ')}</span>
    </div>
  );
}
