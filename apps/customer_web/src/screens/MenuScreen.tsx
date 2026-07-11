import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadMenu, type MenuData } from '../lib/api';
import { money } from '../lib/format';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';
import { Spinner } from '../components/Spinner';
import type { Product } from '../types';

export function MenuScreen() {
  const navigate = useNavigate();
  const { session } = useSession();
  const cart = useCart();
  const [data, setData] = useState<MenuData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.branchId) {
      navigate('/', { replace: true });
      return;
    }
    let alive = true;
    loadMenu(session.branchId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Error cargando el menú'));
    return () => {
      alive = false;
    };
  }, [session?.branchId, navigate]);

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-hint">{error}</p>
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-brand">
          Volver
        </button>
      </div>
    );
  }

  if (!data) return <Spinner label="Cargando menú…" />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 px-5 py-4 backdrop-blur safe-top">
        <p className="text-xs font-medium uppercase tracking-wide text-hint">
          {session?.branchName}
        </p>
        <h1 className="font-display text-2xl font-semibold">Menú</h1>
      </header>

      <div className="flex-1 px-4 pb-28 pt-2">
        {data.categories.map((cat) => {
          const products = data.products.filter((p) => p.categoryId === cat.id);
          if (products.length === 0) return null;
          return (
            <section key={cat.id} className="mt-5">
              <h2 className="px-1 font-display text-lg font-semibold">{cat.name}</h2>
              <div className="mt-2 flex flex-col gap-2.5">
                {products.map((p) => (
                  <ProductRow key={p.id} product={p} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {cart.itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 safe-bottom">
          <button
            onClick={() => navigate('/cart')}
            className="flex w-full items-center justify-between rounded-2xl bg-brand px-5 py-4 text-white shadow-xl shadow-brand/30 active:scale-[0.99]"
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/25 px-2 text-sm font-bold">
              {cart.itemCount}
            </span>
            <span className="font-semibold">Ver mi pedido</span>
            <span className="font-semibold">{money(cart.subtotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const cart = useCart();
  const qty = cart.quantityOf(product.id);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-surface text-2xl">
          🍴
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{product.name}</p>
        {product.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-hint">{product.description}</p>
        )}
        <p className="mt-1 font-semibold text-brand">{money(product.price)}</p>
      </div>

      {qty === 0 ? (
        <button
          onClick={() => cart.add(product)}
          className="flex-shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white active:scale-95"
        >
          Agregar
        </button>
      ) : (
        <div className="flex flex-shrink-0 items-center gap-2.5 rounded-xl bg-brand px-2 py-1.5 text-white">
          <button
            onClick={() => cart.setQuantity(product.id, qty - 1)}
            className="flex h-7 w-7 items-center justify-center text-lg font-bold"
            aria-label="Quitar uno"
          >
            −
          </button>
          <span className="min-w-4 text-center text-sm font-bold">{qty}</span>
          <button
            onClick={() => cart.setQuantity(product.id, qty + 1)}
            className="flex h-7 w-7 items-center justify-center text-lg font-bold"
            aria-label="Agregar uno"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
