import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, ensureAnonAuth } from '../lib/firebase';
import {
  CHALLENGES, REWARDS, googleWalletEnabled, googleWalletUrl, STAMP_GOAL, challengeProgress, clubOrgId, memberId, tierOf, watchMember,
  type Member, EMPTY_MEMBER,
} from '../lib/club';
import { loadHome } from '../lib/home';
import { useSession } from '../store/session';
import { ClubNav } from '../components/ClubNav';
import { Icon } from '../components/Icon';
import { MemberQr } from '../components/MemberQr';
import { Spinner } from '../components/Spinner';

/** Mi Club: points, member QR, stamp card and the weekly challenge. */
export function ClubScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const orgId = clubOrgId(session?.orgId);
  const [member, setMember] = useState<Member>(EMPTY_MEMBER);
  const [loaded, setLoaded] = useState(false);
  const [uid, setUid] = useState('');
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState('');

  useEffect(() => {
    ensureAnonAuth().then(() => setUid(auth.currentUser?.uid ?? '')).catch(() => undefined);
    return watchMember(orgId, (m, ok) => {
      setMember(m);
      setLoaded(ok);
    });
  }, [orgId]);

  const addToWallet = async () => {
    setWalletBusy(true);
    setWalletError('');
    try {
      window.location.href = await googleWalletUrl(orgId);
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'No pudimos abrir Google Wallet.');
      setWalletBusy(false);
    }
  };

  if (!loaded) return <Spinner label="Abriendo tu Club…" />;

  const name = member.name || session?.customerName || loadHome()?.customerName || '';
  const tier = tierOf(member.tier);
  const next = REWARDS.filter((r) => r.cost > member.points).sort((a, b) => a.cost - b.cost)[0];
  const affordable = REWARDS.filter((r) => r.cost <= member.points).sort((a, b) => b.cost - a.cost)[0];
  const prog = challengeProgress(member);
  const left = STAMP_GOAL - member.stamps;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col items-center px-5 pt-5 safe-top">
        <img src="/brand/logo.png" alt="Pick & Eat" className="h-[72px] w-auto object-contain" />
      </div>

      <div className="flex items-center justify-between px-5 pt-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-hint">Hola,</p>
          <h1 className="font-display text-[28px] font-semibold leading-[1.1]">{name || 'Bienvenido'}</h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-tint px-3 py-2 text-[13px] font-semibold text-gold-ink">
          <Icon name="star" size={14} />
          Nivel {tier.label}
        </span>
      </div>

      <div className="mx-5 mt-4 flex flex-col gap-3.5 rounded-3xl bg-brand p-[18px] pb-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs uppercase tracking-[0.08em] text-brand-mist">Pick &amp; Eat Club</p>
            <p className="font-display text-[44px] font-semibold leading-none">
              {member.points} <span className="text-lg font-medium">puntos</span>
            </p>
            <p className="text-sm text-brand-tint">
              {affordable ? (
                <>Ya puedes canjear <strong className="text-gold-light">{affordable.name}</strong></>
              ) : next ? (
                <>Te faltan <strong className="text-gold-light">{next.cost - member.points} puntos</strong> para {next.name.toLowerCase()}</>
              ) : null}
            </p>
          </div>
          <div className="h-[92px] w-[92px] shrink-0 rounded-[14px] bg-white p-2">
            <MemberQr value={orgId && uid ? memberId(orgId, uid) : ''} size={76} label="Código de socio" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#5A8443] pt-3">
          <p className="text-[13px] text-brand-mist">Tus puntos se suman solos al pagar</p>
          {googleWalletEnabled && member.visits > 0 ? (
            <button
              onClick={() => void addToWallet()}
              disabled={walletBusy}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-gold-light disabled:opacity-60"
            >
              {walletBusy ? 'Abriendo…' : 'Añadir a Google Wallet'}
              <Icon name="chevron" size={14} />
            </button>
          ) : (
            <span className="text-[13px] font-semibold text-gold-light/70">Wallet · Próximamente</span>
          )}
        </div>
        {walletError && <p className="text-xs text-gold-light">{walletError}</p>}
      </div>

      <div className="mx-5 mt-3.5 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Tarjeta de sellos</h2>
          <p className="text-[13px] text-hint">{member.stamps} de {STAMP_GOAL}</p>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {Array.from({ length: STAMP_GOAL }, (_, i) => {
            if (i < member.stamps)
              return (
                <span key={i} className="flex aspect-square items-center justify-center rounded-full bg-brand text-white">
                  <Icon name="check" size={16} strokeWidth={3} />
                </span>
              );
            const last = i === STAMP_GOAL - 1;
            return (
              <span key={i} className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-gold text-gold-dark">
                {last && <Icon name="gift" size={16} />}
              </span>
            );
          })}
        </div>
        <p className="text-[13px] text-hint">
          Te {left === 1 ? 'falta' : 'faltan'} <strong className="text-ink">{left} {left === 1 ? 'pedido' : 'pedidos'}</strong> para un Bowl gratis.
        </p>
      </div>

      <div className="mx-5 mt-3.5 flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-tint text-gold-dark">
          <Icon name="flame" size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold">Reto de la semana: {CHALLENGES.visits.target} visitas</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#EFEAE0]">
            <div className="h-full bg-gold" style={{ width: `${Math.min(100, (prog.visits / CHALLENGES.visits.target) * 100)}%` }} />
          </div>
          <p className="text-xs text-hint">{Math.min(prog.visits, CHALLENGES.visits.target)} de {CHALLENGES.visits.target} · ganas +{CHALLENGES.visits.points} puntos</p>
        </div>
        <Link to="/club/challenges" aria-label="Ver retos" className="text-brand">
          <Icon name="chevron" size={20} />
        </Link>
      </div>

      <div className="mt-auto flex gap-2.5 px-5 pt-3.5">
        <button
          onClick={() => navigate(session ? '/menu' : '/')}
          className="inline-flex h-[52px] flex-1 items-center justify-center rounded-xl bg-brand text-base font-semibold text-white"
        >
          Pedir ahora
        </button>
        <Link
          to="/club/rewards"
          className="inline-flex h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-brand bg-white text-base font-semibold text-brand"
        >
          Canjear
        </Link>
      </div>

      <ClubNav />
    </div>
  );
}
