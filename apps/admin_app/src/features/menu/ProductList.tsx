import { Button, IconButton } from '@/components/ui/button';
import { Card, EmptyState, ExtendedFab, Switch, TagChip } from '@/components/ui/m3';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  categoryName: string;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (product: Product) => void;
}

export default function ProductList({
  products,
  loading,
  categoryName,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: ProductListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando productos">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--md-sys-color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="t-title-large truncate text-[var(--md-sys-color-on-surface)]">{categoryName}</h3>
          <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>
        {/* Phones get the extended FAB instead (below). */}
        <Button icon="add" onClick={onAdd} className="max-[839px]:hidden">
          Agregar producto
        </Button>
      </div>

      <div className="min-[840px]:hidden">
        <ExtendedFab icon="add" onClick={onAdd}>
          Agregar producto
        </ExtendedFab>
      </div>

      {products.length === 0 ? (
        <Card>
          <EmptyState
            icon="restaurant"
            title="No hay productos en esta categoría."
            action={
              <Button variant="tonal" icon="add" onClick={onAdd}>
                Crear el primero
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-1 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] p-2">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface ProductRowProps {
  product: Product;
  onEdit: (product: Product) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (product: Product) => void;
}

/** One product as a menu line: photo, name, description, note for the waiter, big price. */
function ProductRow({ product, onEdit, onToggle, onDelete }: ProductRowProps) {
  const switchId = `product-active-${product.id}`;
  const modifierCount = product.modifierGroups?.length ?? 0;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[var(--md-sys-color-surface-container)] sm:flex-nowrap sm:px-4">
      {/* Inactive products are dimmed; the controls stay at full contrast. */}
      <button
        type="button"
        onClick={() => onEdit(product)}
        className={cn('flex min-w-0 flex-1 items-center gap-4 text-left', !product.isActive && 'opacity-50')}
        aria-label={`Editar ${product.name}`}
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" loading="lazy" className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover" />
        ) : (
          <span
            className="t-title-large grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl border-2 border-dashed border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface-variant)]"
            aria-hidden="true"
          >
            {product.name.trim().charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="t-title-medium block truncate font-bold text-[var(--md-sys-color-on-surface)]">{product.name}</span>
          {product.description && (
            <span className="t-body-medium mt-0.5 block truncate text-[var(--md-sys-color-on-surface-variant)]">
              {product.description}
            </span>
          )}
          {product.waiterNote && (
            <span className="t-body-small mt-0.5 block truncate font-semibold text-[var(--md-sys-color-tertiary)]">
              Para el mesero: {product.waiterNote}
            </span>
          )}
          {((product.tags?.length ?? 0) > 0 || modifierCount > 0) && (
            <span className="mt-2 flex flex-wrap gap-2">
              {product.tags?.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
              {modifierCount > 0 && (
                <TagChip icon="tune">
                  {modifierCount} {modifierCount === 1 ? 'grupo de opciones' : 'grupos de opciones'}
                </TagChip>
              )}
            </span>
          )}
        </span>
        <span className="t-number shrink-0 text-[30px] font-bold leading-none text-[var(--md-sys-color-on-surface)]">
          ${product.price.toFixed(2)}
        </span>
      </button>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Switch
          id={switchId}
          checked={product.isActive}
          onChange={(checked) => onToggle(product.id, checked)}
          label={product.isActive ? `${product.name}: disponible` : `${product.name}: no disponible`}
        />
        <span className="t-body-small min-w-0 flex-1 text-[var(--md-sys-color-on-surface-variant)] sm:hidden">
          {product.isActive ? 'Disponible' : 'No disponible'}
        </span>
        <IconButton icon="edit" label={`Editar ${product.name}`} onClick={() => onEdit(product)} />
        <IconButton
          icon="delete"
          label={`Eliminar ${product.name}`}
          className="text-[var(--md-sys-color-error)]"
          onClick={() => onDelete(product)}
        />
      </div>
    </li>
  );
}
