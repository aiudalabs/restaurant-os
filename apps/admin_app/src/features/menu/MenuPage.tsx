import { useState } from 'react';
import { Plus, UtensilsCrossed, Store, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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
  const { selectedBranch, updateBranch, loading: branchLoading } = useBranchContext();

  const { menus, loading: menusLoading, createMenu, updateMenu, deleteMenu } = useMenus(orgId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [confirmProduct, setConfirmProduct] = useState<Product | null>(null);
  const [confirmMenu, setConfirmMenu] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // The menu is determined by the SELECTED BRANCH — never the whole org.
  const activeMenuId = selectedBranch?.menuId ?? '';
  const branchMenu = menus.find((m) => m.id === activeMenuId) ?? null;

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
    deleteProduct,
  } = useProducts(activeMenuId, activeCategoryId);

  // Create a brand-new menu AND assign it to the current branch in one step, so a
  // branch's menu is always its own (no orphan org-wide menus).
  const createMenuForBranch = async (data: { orgId: string; name: string; isActive: boolean }) => {
    const id = await createMenu(data);
    if (selectedBranch) await updateBranch(selectedBranch.id, { menuId: id });
    return id;
  };

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

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  if (menusLoading || branchLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  // No branch selected/created yet → can't have a menu.
  if (!selectedBranch) {
    return (
      <div className="m3-card flex flex-col items-center gap-3 p-12 text-center">
        <Store className="h-10 w-10 text-gray-400" />
        <p className="text-gray-500">Primero crea una sucursal en la sección «Sucursales».</p>
      </div>
    );
  }

  // Branch has no menu yet → create one FOR THIS BRANCH (never show another branch's menu).
  if (!activeMenuId) {
    return (
      <div className="m3-card flex flex-col items-center gap-3 p-12 text-center">
        <UtensilsCrossed className="h-10 w-10 text-gray-400" />
        <p className="font-semibold text-gray-900">
          «{selectedBranch.name}» todavía no tiene menú
        </p>
        <p className="max-w-sm text-sm text-gray-500">
          Crea el menú de esta sucursal. Será el que vean sus clientes al escanear el QR.
          Para reutilizar el menú de otra sucursal, asígnalo desde «Sucursales».
        </p>
        <Button onClick={() => setShowMenuForm(true)}>
          <Plus className="h-5 w-5" /> Crear menú para esta sucursal
        </Button>
        {showMenuForm && (
          <MenuFormDialog orgId={orgId} onSave={createMenuForBranch} onClose={() => setShowMenuForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Which branch's menu you're editing — no org-wide menu picker. */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-container)] px-4 py-2 text-sm font-semibold text-[var(--color-on-primary-container)]">
          <Store className="h-4 w-4" />
          {selectedBranch.name}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-container-high)] px-4 py-2 text-sm font-medium text-gray-700">
          <UtensilsCrossed className="h-4 w-4 text-orange-600" />
          {branchMenu?.name ?? 'Menú'}
        </span>
        {branchMenu && (
          <>
            <button
              onClick={() => {
                setRenameValue(branchMenu.name);
                setRenameOpen(true);
              }}
              className="m3-state rounded-full p-2 text-gray-500"
              title="Renombrar menú"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmMenu(true)}
              className="m3-state rounded-full p-2 text-red-600"
              title="Eliminar menú"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex gap-6">
        {/* Categories */}
        <div className="m3-card w-64 shrink-0 self-start p-4">
          <CategoryList
            categories={categories}
            selectedId={activeCategoryId}
            onSelect={(id) => setSelectedCategoryId(id)}
            onCreate={handleCreateCategory}
            onUpdate={(id, name) => updateCategory(id, { name })}
            onDelete={deleteCategory}
            onToggle={(id, isActive) => updateCategory(id, { isActive })}
            loading={categoriesLoading}
          />
        </div>

        {/* Products */}
        <div className="min-w-0 flex-1">
          {activeCategoryId ? (
            <ProductList
              products={products}
              loading={productsLoading}
              categoryName={selectedCategory?.name ?? ''}
              onAdd={handleAddProduct}
              onEdit={handleEditProduct}
              onToggle={toggleProduct}
              onDelete={setConfirmProduct}
            />
          ) : (
            <div className="m3-card flex items-center justify-center p-10 text-gray-400">
              Crea una categoría para empezar a agregar productos.
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

      {confirmProduct && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`¿Eliminar "${confirmProduct.name}"? Esta acción no se puede deshacer.`}
          onConfirm={() => deleteProduct(confirmProduct.id)}
          onClose={() => setConfirmProduct(null)}
        />
      )}

      {confirmMenu && (
        <ConfirmDialog
          title="Eliminar menú"
          message={`¿Eliminar el menú "${branchMenu?.name}" con sus categorías y productos? La sucursal quedará sin menú.`}
          onConfirm={async () => {
            if (activeMenuId) await deleteMenu(activeMenuId);
            if (selectedBranch) await updateBranch(selectedBranch.id, { menuId: '' });
          }}
          onClose={() => setConfirmMenu(false)}
        />
      )}

      {renameOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="m3-card w-full max-w-sm rounded-[1.75rem] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Renombrar menú</h2>
              <button onClick={() => setRenameOpen(false)} className="m3-state rounded-full p-2 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Input
              id="menu-rename"
              label="Nombre del menú"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (activeMenuId && renameValue.trim()) {
                    await updateMenu(activeMenuId, { name: renameValue.trim() });
                  }
                  setRenameOpen(false);
                }}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
