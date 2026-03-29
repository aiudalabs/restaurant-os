import { Plus, Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  categoryName: string;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onToggle: (id: string, isActive: boolean) => void;
}

export default function ProductList({
  products,
  loading,
  categoryName,
  onAdd,
  onEdit,
  onToggle,
}: ProductListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-1.5 h-4 w-4" />
          Agregar producto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-sm text-gray-500">
            No hay productos en esta categoría.
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" />
            Crear el primero
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={cn(
                'rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm',
                !product.isActive && 'opacity-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {product.name}
                  </h4>
                  {product.description && (
                    <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-orange-700 whitespace-nowrap">
                  ${product.price.toFixed(2)}
                </span>
              </div>

              {product.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {product.modifierGroups.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">
                  {product.modifierGroups.length} grupo(s) de modificadores
                </p>
              )}

              <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onEdit(product)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 text-xs',
                    product.isActive ? 'text-gray-500' : 'text-green-600',
                  )}
                  onClick={() => onToggle(product.id, !product.isActive)}
                >
                  <Power className="mr-1 h-3.5 w-3.5" />
                  {product.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
