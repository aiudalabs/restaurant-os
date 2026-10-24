import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REWARDS, clubOrgId, redeemReward, watchMember, watchVouchers, EMPTY_MEMBER, type Member, type Voucher } from '../lib/club';
import { useSession } from '../store/session';
import { BackButton, Icon } from '../components/Icon';
import { Spinner } from '../components/Spinner';

const ICON = { dessert: 'cup', juice: 'juice', bowl: 'bowl', box: 'box' } as const;

/** Canjear puntos: free-product vouchers. The order total and invoice never change. */
export function RewardsScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const orgId = clubOrgId(session?.orgId);
  const [member, setMember] = useState<Member>(EMPTY_MEMBER);
  const [loaded, setLoaded] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [confirming, setConfirming] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const a = watchMember(orgId, (m, ok) => {
      setMember(m);
      setLoaded(ok);
    });
    const b = watchVouchers(orgId, setVouchers);
    return () => {
      a();
      b();
    };
  }, [orgId]);

  const redeem = async (rewardId: string) => {
    setBusy(true);
    setError('');
    try {
      await redeemReward(orgId, rewardId);
      setConfirming('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos canjear. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <Spinner label="Cargando recompensas…" />;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 px-5 pt-[18px] safe-top">
        <BackButton onClick={() => navigate('/club')} />
        <h1 className="font-display text-[26px] font-semibold">Canjear puntos</h1>
      </header>

      <div className="mx-5 mt-4 flex items-center justify-between rounded-2xl bg-brand px-4 py-3.5 text-white">
        <p className="text-sm text-brand-mist">Tienes</p>
        <p className="font-display text-[28px] font-semibold">{member.points} puntos</p>
      </div>

      {vouchers.length > 0 && (
        <>
          <p className="mx-5 mt-[18px] text-xs uppercase tracking-[0.08em] text-hint">Tus cupones</p>
          <ul className="mx-5 mt-2.5 flex flex-col gap-2.5">
            {vouchers.map((v) => (
              <li key={v.code} className="flex items-center gap-3 rounded-2xl border-[1.5px] border-gold bg-gold-tint p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink">
                  <Icon name="gift" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-[15px] font-semibold">{v.rewardName}</p>
                  <p className="text-xs text-gold-ink">Muestra este código en caja</p>
                </div>
                <p className="font-display text-2xl font-semibold tracking-widest">{v.code}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mx-5 mt-[18px] text-xs uppercase tracking-[0.08em] text-hint">Recompensas disponibles</p>
      <ul className="mx-5 mt-2.5 flex flex-col gap-2.5">
        {REWARDS.map((r) => {
          const can = member.points >= r.cost;
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 rounded-2xl p-4 ${can ? 'border border-line bg-white' : 'border border-dashed border-[#D5CFC1] bg-[#F4F1EA]'}`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${can ? 'bg-brand-tint text-brand' : 'bg-[#EAE5D9] text-[#8A8578]'}`}>
                <Icon name={ICON[r.icon]} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className={`text-[15px] font-semibold ${can ? '' : 'text-[#5F5B52]'}`}>{r.name}</p>
                <p className="text-[13px] text-hint">
                  {r.cost} puntos{can ? '' : ` · te faltan ${r.cost - member.points}`}
                </p>
              </div>
              {can &&
                (confirming === r.id ? (
                  <button
                    onClick={() => void redeem(r.id)}
                    disabled={busy}
                    className="h-10 rounded-xl bg-gold px-3.5 text-[13px] font-semibold text-ink disabled:opacity-60"
                  >
                    {busy ? 'Canjeando…' : `Confirmar −${r.cost}`}
                  </button>
                ) : (
                  <button onClick={() => setConfirming(r.id)} className="h-10 rounded-xl bg-brand px-3.5 text-[13px] font-semibold text-white">
                    Canjear
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
      {error && <p className="mx-5 mt-3 text-center text-sm text-danger">{error}</p>}

      <div className="mx-5 mt-4 flex items-start gap-3 rounded-2xl border border-line bg-white p-4">
        <Icon name="bell" size={20} className="mt-0.5 shrink-0 text-gold-dark" />
        <p className="text-[13px] leading-[1.4] text-[#5F5B52]">
          Al canjear recibes un código. Muéstralo en caja y te entregan el producto. No cambia el total de tu pedido ni tu factura.
        </p>
      </div>

      <div className="mt-auto px-5 pb-5 pt-4">
        <Link
          to="/club/challenges"
          className="flex h-[52px] items-center justify-center rounded-xl border-[1.5px] border-brand bg-white text-base font-semibold text-brand"
        >
          ¿Cómo gano más puntos?
        </Link>
      </div>
    </div>
  );
}
