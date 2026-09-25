import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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
        <div className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (product: Product) => void;
}

function ProductCard({ product, onEdit, onToggle, onDelete }: ProductCardProps) {
  const switchId = `product-active-${product.id}`;
  const modifierCount = product.modifierGroups?.length ?? 0;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Inactive products are dimmed; the controls below stay at full contrast. */}
      <div className={cn('flex flex-1 flex-col', !product.isActive && 'opacity-50')}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-36 w-full object-cover" />
        ) : (
          <div
            className="t-display-small grid h-36 w-full place-items-center bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]"
            aria-hidden="true"
          >
            {product.name.trim().charAt(0).toUpperCase() || '?'}
          </div>
        )}

        <div className="flex flex-1 flex-col px-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <h4 className="t-title-medium min-w-0 flex-1 truncate text-[var(--md-sys-color-on-surface)]">
              {product.name}
            </h4>
            <span className="t-title-large whitespace-nowrap tabular-nums text-[var(--md-sys-color-on-surface)]">
              ${product.price.toFixed(2)}
            </span>
          </div>
          {product.description && (
            <p className="t-body-medium mt-1 line-clamp-2 text-[var(--md-sys-color-on-surface-variant)]">
              {product.description}
            </p>
          )}

          {(product.tags?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.tags?.map((tag) => (
                <TagChip key={tag}>{tag}</TagChip>
              ))}
            </div>
          )}

          {modifierCount > 0 && (
            <p className="t-body-small mt-3 inline-flex items-center gap-1 text-[var(--md-sys-color-on-surface-variant)]">
              <Icon name="tune" size={16} />
              {modifierCount} grupo(s) de modificadores
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-[var(--md-sys-color-outline-variant)] py-2 pl-4 pr-2">
        <Switch id={switchId} checked={product.isActive} onChange={(checked) => onToggle(product.id, checked)} />
        <label htmlFor={switchId} className="t-label-large min-w-0 flex-1 cursor-pointer text-[var(--md-sys-color-on-surface-variant)]">
          {product.isActive ? 'Disponible' : 'No disponible'}
        </label>
        <IconButton icon="edit" label={`Editar ${product.name}`} onClick={() => onEdit(product)} />
        <IconButton
          icon="delete"
          label={`Eliminar ${product.name}`}
          className="text-[var(--md-sys-color-error)]"
          onClick={() => onDelete(product)}
        />
      </div>
    </Card>
  );
}
