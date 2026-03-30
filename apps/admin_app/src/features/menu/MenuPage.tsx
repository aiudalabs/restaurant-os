import { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useMenus, useCategories, useProducts } from '@/hooks/use-menu';
import CategoryList from './CategoryList';
import ProductList from './ProductList';
import ProductFormDialog from './ProductFormDialog';
import MenuFormDialog from './MenuFormDialog';
import type { Product } from '@/types/product';

export default function MenuPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const { selectedBranch, updateBranch } = useBranchContext();

  const { menus, loading: menusLoading, createMenu } = useMenus(orgId);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [linkingMenu, setLinkingMenu] = useState(false);

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
    createProduct,
    updateProduct,
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

  const handleLinkMenu = async () => {
    if (!selectedBranch || !activeMenuId) return;
    setLinkingMenu(true);
    try {
      await updateBranch(selectedBranch.id, { menuId: activeMenuId });
    } finally {
      setLinkingMenu(false);
    }
  };

  if (menus.length === 0) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900">Menú</h1>
        <p className="mt-2 text-gray-500">No hay menús creados.</p>
        <Button className="mt-4" onClick={() => setShowMenuForm(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Crear menú
        </Button>
        {showMenuForm && (
          <MenuFormDialog
            orgId={orgId}
            onSave={createMenu}
            onClose={() => setShowMenuForm(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menú</h1>

        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" onClick={() => setShowMenuForm(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo menú
          </Button>
        </div>
      </div>

      {/* Link menu to branch banner */}
      {selectedBranch && !selectedBranch.menuId && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              La sucursal &quot;{selectedBranch.name}&quot; no tiene un menú asignado.
            </p>
            <p className="text-xs text-amber-600">
              Asigna un menú para que los clientes puedan hacer pedidos.
            </p>
          </div>
          <Button
            size="sm"
            disabled={linkingMenu}
            onClick={handleLinkMenu}
          >
            {linkingMenu ? 'Asignando...' : 'Asignar menú actual'}
          </Button>
        </div>
      )}

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

      {showProductForm && (
        <ProductFormDialog
          product={editingProduct}
          orgId={orgId}
          menuId={activeMenuId}
          categoryId={activeCategoryId}
          onSave={createProduct}
          onUpdate={updateProduct}
          onClose={() => setShowProductForm(false)}
        />
      )}

      {showMenuForm && (
        <MenuFormDialog
          orgId={orgId}
          onSave={createMenu}
          onClose={() => setShowMenuForm(false)}
        />
      )}
    </div>
  );
}
