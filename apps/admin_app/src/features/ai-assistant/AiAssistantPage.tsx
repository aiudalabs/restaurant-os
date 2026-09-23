import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Card, StatusChip, TagChip } from '@/components/ui/m3';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import {
  requestPlan, applyPlan, parseCsv,
  type BuildPlan, type ProductRow, type ActionResult, type ChatTurn,
} from './ai.service';

interface Msg {
  id: number;
  role: 'user' | 'assistant';
  type: 'text' | 'plan' | 'results' | 'error';
  text?: string;
  attachment?: { name: string; count: number }; // CSV sent with a user message
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

// Products listed before the "ver todos" toggle in a plan preview.
const PRODUCT_PREVIEW = 6;

let _id = 1;
const nextId = () => _id++;

// Condense the visible conversation into turns the model can reason over.
function buildHistory(msgs: Msg[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of msgs) {
    if (m.role === 'user' && m.text) {
      const note = m.attachment ? `\n\n[CSV adjunto: ${m.attachment.name} (${m.attachment.count} productos)]` : '';
      turns.push({ role: 'user', text: m.text + note });
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
    const history = buildHistory(messages);
    push({
      role: 'user', type: 'text', text,
      attachment: attachedCsv ? { name: attachedCsv.name, count: attachedCsv.rows.length } : undefined,
    });
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

  // Fills the main area exactly: 4rem top app bar + main's bottom padding
  // (pb-28 on phones, which clears the navigation bar; pb-10 from sm).
  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-80 flex-col sm:h-[calc(100dvh-6.5rem)]">
      <p className="t-body-medium flex items-center gap-2 pb-3 text-[var(--md-sys-color-on-surface-variant)]">
        <Icon name="storefront" size={18} className="shrink-0" />
        <span>
          Lo armo en{' '}
          <span className="font-medium text-[var(--md-sys-color-on-surface)]">{selectedBranch?.name ?? 'tu sucursal'}</span>.
          Confirmas antes de crear.
        </span>
      </p>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center px-2 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
              <Icon name="auto_awesome" filled size={32} />
            </span>
            <p className="t-title-medium mt-4 text-[var(--md-sys-color-on-surface)]">¿Qué armamos hoy?</p>
            <p className="t-body-medium mt-1 max-w-sm text-[var(--md-sys-color-on-surface-variant)]">
              Pídeme crear estaciones, menús, categorías o productos. Puedes adjuntar un CSV de productos.
            </p>
            <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="m3-state t-label-large inline-flex min-h-8 items-center gap-2 rounded-lg border border-[var(--md-sys-color-outline-variant)] py-1.5 pl-2 pr-4 text-left text-[var(--md-sys-color-on-surface)]"
                >
                  <Icon name="lightbulb" size={18} className="shrink-0 text-[var(--md-sys-color-primary)]" />
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
          <AssistantBubble>
            <span className="t-body-medium flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)]">
              <Icon name="progress_activity" size={18} className="animate-spin" /> Pensando el plan…
            </span>
          </AssistantBubble>
        )}
      </div>

      {/* Composer — docked at the bottom of the page */}
      <div className="shrink-0 space-y-2 pt-2">
        {csv && (
          <TagChip icon="table" className="max-w-full pr-1">
            <span className="truncate">{csv.name} · {csv.rows.length} productos</span>
            <button
              type="button"
              onClick={() => setCsv(null)}
              aria-label="Quitar CSV"
              className="m3-state grid h-6 w-6 shrink-0 place-items-center rounded-full"
            >
              <Icon name="close" size={18} />
            </button>
          </TagChip>
        )}
        <div className="flex items-end gap-1">
          <input
            ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
          />
          <IconButton
            icon="attach_file"
            label="Adjuntar CSV de productos"
            onClick={() => fileRef.current?.click()}
            className="mb-1"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            aria-label="Mensaje para el asistente"
            placeholder="Ej: crea Cocina y Bar, y un menú Carta con Pizzas y Bebidas…"
            className="t-body-large field-sizing-content max-h-32 min-h-12 min-w-0 flex-1 resize-none rounded-3xl bg-[var(--md-sys-color-surface-container-high)] px-5 py-3 text-[var(--md-sys-color-on-surface)] outline-none placeholder:text-[var(--md-sys-color-on-surface-variant)] focus-visible:outline-2 focus-visible:outline-[var(--md-sys-color-primary)]"
          />
          <IconButton
            icon="send"
            label="Enviar"
            variant="filled"
            onClick={send}
            disabled={!input.trim() || sending}
            className="mb-1"
          />
        </div>
      </div>
    </div>
  );
}

// M3 chat bubbles: 20px corners, tighter on the sender's side.
function AssistantBubble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="flex justify-start">
      <div className={cn('max-w-[92%] rounded-[20px] rounded-bl-[4px] bg-[var(--md-sys-color-surface-container-high)] px-4 py-3', className)}>
        {children}
      </div>
    </div>
  );
}

function MessageBubble({
  msg, applying, onConfirm, onDiscard,
}: { msg: Msg; applying: boolean; onConfirm: () => void; onDiscard: () => void }) {
  if (msg.role === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="t-body-medium max-w-[80%] whitespace-pre-wrap break-words rounded-[20px] rounded-br-[4px] bg-[var(--md-sys-color-primary-container)] px-4 py-2.5 text-[var(--md-sys-color-on-primary-container)]">
          {msg.text}
        </div>
        {msg.attachment && (
          <TagChip icon="table" className="max-w-[80%]">
            <span className="truncate">{msg.attachment.name} · {msg.attachment.count} productos</span>
          </TagChip>
        )}
      </div>
    );
  }

  if (msg.type === 'error') {
    return (
      <div className="t-body-medium flex max-w-[92%] items-start gap-2 rounded-xl bg-[var(--md-sys-color-error-container)] px-4 py-3 text-[var(--md-sys-color-on-error-container)]">
        <Icon name="error" size={20} className="shrink-0" /> <span className="min-w-0 break-words">{msg.text}</span>
      </div>
    );
  }

  if (msg.type === 'plan' && msg.plan) {
    return <PlanCard msg={msg} plan={msg.plan} applying={applying} onConfirm={onConfirm} onDiscard={onDiscard} />;
  }

  if (msg.type === 'results' && msg.results) {
    return (
      <AssistantBubble>
        <div className="flex flex-wrap items-center gap-2">
          <p className="t-title-small text-[var(--md-sys-color-on-surface)]">
            {msg.errCount ? `Creado con ${msg.errCount} error(es)` : 'Listo, todo creado'}
          </p>
          <StatusChip tone="success" icon="check">{msg.okCount}</StatusChip>
          {!!msg.errCount && <StatusChip tone="error" icon="close">{msg.errCount}</StatusChip>}
        </div>
        <ul className="t-body-medium mt-2 space-y-1">
          {msg.results.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              {r.status === 'ok'
                ? <Icon name="check_circle" size={18} className="mt-px shrink-0 text-[var(--md-sys-color-primary)]" />
                : <Icon name="cancel" size={18} className="mt-px shrink-0 text-[var(--md-sys-color-error)]" />}
              <span className={r.status === 'ok' ? 'text-[var(--md-sys-color-on-surface)]' : 'text-[var(--md-sys-color-error)]'}>
                {r.label}{r.detail && r.status !== 'ok' ? ` — ${r.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </AssistantBubble>
    );
  }

  return (
    <AssistantBubble>
      <p className="t-body-medium text-[var(--md-sys-color-on-surface)]">{msg.text}</p>
    </AssistantBubble>
  );
}

function PlanCard({
  msg, plan: p, applying, onConfirm, onDiscard,
}: { msg: Msg; plan: BuildPlan; applying: boolean; onConfirm: () => void; onDiscard: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const nProducts = p.products.length;
  const categories = p.menu?.categories ?? [];
  const visibleProducts = showAll ? p.products : p.products.slice(0, PRODUCT_PREVIEW);

  return (
    <Card className="max-w-[92%] rounded-bl-[4px] p-4 sm:max-w-xl">
      <div className="flex items-start gap-3">
        <Icon name="auto_awesome" filled size={20} className="mt-0.5 shrink-0 text-[var(--md-sys-color-primary)]" />
        <p className="t-title-small text-[var(--md-sys-color-on-surface)]">{p.summary || 'Esto es lo que voy a crear:'}</p>
      </div>

      <div className="mt-3 divide-y divide-[var(--md-sys-color-outline-variant)]">
        {p.stations.length > 0 && (
          <PlanSection icon="soup_kitchen" title="Estaciones">
            <div className="flex flex-wrap gap-2">
              {p.stations.map((s) => <TagChip key={s}>{s}</TagChip>)}
            </div>
          </PlanSection>
        )}

        {p.menu && (
          <PlanSection icon="menu_book" title="Menú" meta={<span className="t-title-small text-[var(--md-sys-color-on-surface)]">{p.menu.name}</span>}>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => <TagChip key={c} icon="category">{c}</TagChip>)}
              </div>
            )}
          </PlanSection>
        )}

        {nProducts > 0 && (
          <PlanSection icon="restaurant" title="Productos" meta={<StatusChip tone="neutral">{nProducts}</StatusChip>}>
            <ul className="space-y-1">
              {visibleProducts.map((x, i) => (
                <li key={`${x.name}-${i}`} className="flex items-center gap-3 py-1">
                  {x.image_url ? (
                    <img src={x.image_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-[var(--md-sys-color-surface-container-highest)] object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]">
                      <Icon name="restaurant" size={20} />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="t-body-medium truncate text-[var(--md-sys-color-on-surface)]">{x.name}</p>
                    {x.category && <p className="t-body-small truncate text-[var(--md-sys-color-on-surface-variant)]">{x.category}</p>}
                  </div>
                  <span className="t-label-large shrink-0 tabular-nums text-[var(--md-sys-color-on-surface)]">${x.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {nProducts > PRODUCT_PREVIEW && (
              <Button variant="ghost" size="sm" icon={showAll ? 'expand_less' : 'expand_more'} onClick={() => setShowAll((v) => !v)} className="mt-1 -ml-3">
                {showAll ? 'Ver menos' : `Ver los ${nProducts}`}
              </Button>
            )}
          </PlanSection>
        )}

        {p.tables && p.tables.count > 0 && (
          <PlanSection icon="table_restaurant" title="Mesas">
            <p className="t-body-medium text-[var(--md-sys-color-on-surface)]">
              {`${p.tables.count} mesa(s) · ${p.tables.capacity} personas`}
              {p.tables.zone ? ` · ${p.tables.zone}` : ''}
            </p>
          </PlanSection>
        )}
      </div>

      {msg.warnings && msg.warnings.length > 0 && (
        <ul className="t-body-small mt-3 space-y-1 rounded-lg bg-[var(--md-sys-color-surface-container-high)] px-3 py-2 text-[var(--md-sys-color-on-surface-variant)]">
          {msg.warnings.map((w, i) => (
            <li key={i} className="flex items-start gap-2">
              <Icon name="warning" size={16} className="mt-px shrink-0 text-[var(--md-sys-color-error)]" /> {w}
            </li>
          ))}
        </ul>
      )}

      {!msg.done ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button onClick={onDiscard} disabled={applying} variant="ghost">Cancelar</Button>
          <Button onClick={onConfirm} disabled={applying} icon={applying ? undefined : 'check'}>
            {applying ? <><Icon name="progress_activity" size={18} className="animate-spin" /> Creando…</> : 'Aplicar'}
          </Button>
        </div>
      ) : (
        <div className="mt-3">
          <StatusChip tone="neutral" icon="done_all">Plan cerrado</StatusChip>
        </div>
      )}
    </Card>
  );
}

function PlanSection({ icon, title, meta, children }: { icon: string; title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <section className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={20} className="shrink-0 text-[var(--md-sys-color-on-surface-variant)]" />
        <h3 className="t-label-large text-[var(--md-sys-color-on-surface-variant)]">{title}</h3>
        {meta}
      </div>
      {children && <div className="mt-2 pl-7">{children}</div>}
    </section>
  );
}
