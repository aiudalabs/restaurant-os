import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHALLENGES, challengeProgress, clubOrgId, nextTier, tierOf, watchMember, EMPTY_MEMBER, type Member } from '../lib/club';
import { useSession } from '../store/session';
import { BackButton, Icon } from '../components/Icon';
import { Spinner } from '../components/Spinner';

/** Retos y niveles: tier progress and the three deterministic challenges. */
export function ChallengesScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const orgId = clubOrgId(session?.orgId);
  const [member, setMember] = useState<Member>(EMPTY_MEMBER);
  const [loaded, setLoaded] = useState(false);

  useEffect(
    () =>
      watchMember(orgId, (m, ok) => {
        setMember(m);
        setLoaded(ok);
      }),
    [orgId],
  );
  if (!loaded) return <Spinner label="Cargando retos…" />;

  const tier = tierOf(member.tier);
  const next = nextTier(member.tier);
  const spent = member.lifetimeSpend;
  const pct = next ? Math.min(100, ((spent - tier.minSpend) / (next.minSpend - tier.minSpend)) * 100) : 100;
  const p = challengeProgress(member);
  const money = (n: number) => `B/. ${Math.floor(n)}`;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 px-5 pt-[18px] safe-top">
        <BackButton onClick={() => navigate('/club')} />
        <h1 className="font-display text-[26px] font-semibold">Retos y niveles</h1>
      </header>

      <div className="mx-5 mt-4 flex flex-col gap-2.5 rounded-[18px] bg-ink p-4 text-white">
        <div className="flex items-center justify-between text-[13px] text-[#B8B8B3]">
          <p>Tu nivel</p>
          <p>{next ? `${next.label} a ${money(next.minSpend)} gastados` : 'Nivel máximo'}</p>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[28px] font-semibold text-gold-light">{tier.label}</p>
          {next && <p className="text-sm">{money(spent)} / {money(next.minSpend)}</p>}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#3A3A38]"><div className="h-full bg-gold" style={{ width: `${pct}%` }} /></div>
        <p className="text-xs text-[#B8B8B3]">
          {next ? `${next.label}: ${next.pointsPerBalboa} puntos por balboa.` : `${tier.pointsPerBalboa} puntos por balboa.`}
        </p>
      </div>

      <p className="mx-5 mt-[18px] text-xs uppercase tracking-[0.08em] text-hint">Retos activos</p>
      <ul className="mx-5 mt-2.5 flex flex-col gap-2.5">
        <Challenge title={`${CHALLENGES.visits.target} visitas esta semana`} pts={CHALLENGES.visits.points} value={p.visits} target={CHALLENGES.visits.target} note="termina el domingo" />
        <Challenge title={`Prueba ${CHALLENGES.dishes.target} platos distintos`} pts={CHALLENGES.dishes.points} value={p.dishes} target={CHALLENGES.dishes.target} note="este mes" />
        <Challenge title={`Racha: ${CHALLENGES.streak.target} semanas seguidas`} pts={CHALLENGES.streak.points} value={p.streak} target={CHALLENGES.streak.target} note="no rompas la racha" segments />
      </ul>

      <div className="mx-5 mt-3.5 flex items-center gap-3 rounded-[18px] bg-gold-tint p-4 opacity-70">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink"><Icon name="user" /></span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-[15px] font-semibold">Invita a un amigo</p>
          <p className="text-[13px] text-gold-ink">Los dos ganan puntos en su primer pedido</p>
        </div>
        <span className="rounded-xl bg-ink px-3 py-2.5 text-xs font-semibold text-white">Próximamente</span>
      </div>

      <p className="mx-5 mb-5 mt-auto pt-4 text-center text-xs leading-[1.4] text-hint">
        Todos los retos tienen premio seguro al cumplirlos. Sin sorteos ni azar.
      </p>
    </div>
  );
}

function Challenge({ title, pts, value, target, note, segments }: { title: string; pts: number; value: number; target: number; note: string; segments?: boolean }) {
  const v = Math.min(value, target);
  return (
    <li className="flex flex-col gap-2 rounded-[18px] border border-line bg-white px-4 py-3.5">
      <div className="flex justify-between gap-2">
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="text-[13px] font-bold text-gold-dark">+{pts} pts</p>
      </div>
      {segments ? (
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${target}, minmax(0, 1fr))` }}>
          {Array.from({ length: target }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i < v ? 'bg-brand' : 'bg-[#EFEAE0]'}`} />
          ))}
        </div>
      ) : (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEAE0]"><div className="h-full bg-gold" style={{ width: `${(v / target) * 100}%` }} /></div>
      )}
      <p className="text-xs text-hint">{v} de {target} · {note}</p>
    </li>
  );
}
