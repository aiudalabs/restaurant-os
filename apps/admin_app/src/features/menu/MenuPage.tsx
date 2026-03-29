import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMenus, useCategories, useProducts } from '@/hooks/use-menu';
import CategoryList from './CategoryList';
import ProductList from './ProductList';
import type { Product } from '@/types/product';

export default function MenuPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';

  const { menus, loading: menusLoading } = useMenus(orgId);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  // Auto-select first menu
  const activeMenuId = selectedMenuId ?? menus[0]?.id ?? '';

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories(activeMenuId);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0];
  const activeCategoryId = selectedCategoryId ?? selectedCategory?.id ?? '';

  const {
    products,
    loading: productsLoading,
    toggleProduct,
  } = useProducts(activeMenuId, activeCategoryId);

  const handleCreateCategory = async (name: string) => {
    if (!orgId || !activeMenuId) return;
    await createCategory({
      orgId,
      menuId: activeMenuId,
      name,
      sortOrder: categories.length,
      isActive: true,
    });
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    await updateCategory(id, { name });
  };

  const handleToggleCategory = async (id: string, isActive: boolean) => {
    await updateCategory(id, { isActive });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  if (menusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (menus.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Menú</h1>
        <p className="mt-2 text-gray-500">
          No hay menús creados. Crea uno desde Firestore o la consola de Firebase.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menú</h1>

        {menus.length > 1 && (
          <select
            value={activeMenuId}
            onChange={(e) => {
              setSelectedMenuId(e.target.value);
              setSelectedCategoryId(null);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex gap-6">
        {/* Left panel — Categories */}
        <div className="w-64 shrink-0">
          <CategoryList
            categories={categories}
            selectedId={activeCategoryId}
            onSelect={(id) => setSelectedCategoryId(id)}
            onCreate={handleCreateCategory}
            onUpdate={handleUpdateCategory}
            onDelete={deleteCategory}
            onToggle={handleToggleCategory}
            loading={categoriesLoading}
          />
        </div>

        {/* Right panel — Products */}
        <div className="flex-1 min-w-0">
          {activeCategoryId ? (
            <ProductList
              products={products}
              loading={productsLoading}
              categoryName={selectedCategory?.name ?? ''}
              onAdd={handleAddProduct}
              onEdit={handleEditProduct}
              onToggle={toggleProduct}
            />
          ) : (
            <div className="flex items-center justify-center py-12 text-gray-400">
              Selecciona una categoría para ver los productos.
            </div>
          )}
        </div>
      </div>

      {/* ProductFormDialog placeholder — will be implemented in issue #12 */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p className="text-sm text-gray-500">
              El formulario completo se implementa en el issue #12.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                className="rounded-lg bg-gray-200 px-4 py-2 text-sm"
                onClick={() => setShowProductForm(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
