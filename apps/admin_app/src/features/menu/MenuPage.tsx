import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Card, EmptyState, PageHeader } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useMenus, useCategories, useProducts } from '@/hooks/use-menu';
import CategoryList from './CategoryList';
import ProductList from './ProductList';
import ProductFormDialog from './ProductFormDialog';
import MenuFormDialog from './MenuFormDialog';
import { countProductsInCategory } from '@/services/menu.service';
import type { Product } from '@/types/product';
import type { Category } from '@/types/menu';

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
  const [confirmCategory, setConfirmCategory] = useState<Category | null>(null);
  const [confirmCatCount, setConfirmCatCount] = useState<number | null>(null);
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

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id) ?? null;
    setConfirmCategory(cat);
    setConfirmCatCount(null);
    if (cat) countProductsInCategory(id).then(setConfirmCatCount).catch(() => setConfirmCatCount(0));
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
      <div className="flex items-center justify-center py-12" role="status" aria-label="Cargando">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent" />
      </div>
    );
  }

  // No branch selected/created yet → can't have a menu.
  if (!selectedBranch) {
    return (
      <Card variant="filled">
        <EmptyState
          icon="storefront"
          title="Todavía no hay sucursales"
          body="Primero crea una sucursal en la sección «Sucursales»."
        />
      </Card>
    );
  }

  // Branch has no menu yet → create one FOR THIS BRANCH (never show another branch's menu).
  if (!activeMenuId) {
    return (
      <Card variant="filled">
        <EmptyState
          icon="restaurant_menu"
          title={`«${selectedBranch.name}» todavía no tiene menú`}
          body="Crea el menú de esta sucursal. Será el que vean sus clientes al escanear el QR. Para reutilizar el menú de otra sucursal, asígnalo desde «Sucursales»."
          action={
            <Button icon="add" onClick={() => setShowMenuForm(true)} className="h-auto min-h-10 whitespace-normal py-2">
              Crear menú para esta sucursal
            </Button>
          }
        />
        {showMenuForm && (
          <MenuFormDialog orgId={orgId} onSave={createMenuForBranch} onClose={() => setShowMenuForm(false)} />
        )}
      </Card>
    );
  }

  return (
    <div className="pb-24 min-[840px]:pb-0">
      {/* Which branch's menu you're editing — no org-wide menu picker. */}
      <PageHeader
        title={branchMenu?.name ?? 'Menú'}
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <Icon name="storefront" size={18} />
            Menú de la sucursal «{selectedBranch.name}»
          </span>
        }
        actions={
          branchMenu && (
            <>
              <Button
                variant="outlined"
                icon="edit"
                onClick={() => {
                  setRenameValue(branchMenu.name);
                  setRenameOpen(true);
                }}
              >
                Renombrar
              </Button>
              <Button
                variant="ghost"
                icon="delete"
                className="text-[var(--md-sys-color-error)]"
                onClick={() => setConfirmMenu(true)}
              >
                Eliminar menú
              </Button>
            </>
          )
        }
      />

      {/* Stacked on phones; categories become a side pane from 840px (M3 expanded) up. */}
      <div className="flex flex-col gap-6 min-[840px]:flex-row min-[840px]:items-start">
        <Card variant="filled" className="w-full shrink-0 p-3 min-[840px]:sticky min-[840px]:top-4 min-[840px]:w-72">
          <CategoryList
            categories={categories}
            selectedId={activeCategoryId}
            onSelect={(id) => setSelectedCategoryId(id)}
            onCreate={handleCreateCategory}
            onUpdate={(id, name) => updateCategory(id, { name })}
            onDelete={handleDeleteCategory}
            onToggle={(id, isActive) => updateCategory(id, { isActive })}
            loading={categoriesLoading}
          />
        </Card>

        <section className="@container min-w-0 flex-1" aria-label="Productos">
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
            <Card>
              <EmptyState
                icon="category"
                title="Sin categorías"
                body="Crea una categoría para empezar a agregar productos."
              />
            </Card>
          )}
        </section>
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

      {confirmCategory && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={
            confirmCatCount === null
              ? `Calculando cuántos productos hay en "${confirmCategory.name}"…`
              : confirmCatCount > 0
                ? `¿Eliminar "${confirmCategory.name}"? Se borrarán también sus ${confirmCatCount} producto(s). Esta acción no se puede deshacer.`
                : `¿Eliminar "${confirmCategory.name}"? No tiene productos. Esta acción no se puede deshacer.`
          }
          onConfirm={() => deleteCategory(confirmCategory.id)}
          onClose={() => { setConfirmCategory(null); setConfirmCatCount(null); }}
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
        <Dialog
          title="Renombrar menú"
          onClose={() => setRenameOpen(false)}
          className="sm:max-w-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            if (activeMenuId && renameValue.trim()) {
              await updateMenu(activeMenuId, { name: renameValue.trim() });
            }
            setRenameOpen(false);
          }}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </>
          }
        >
          <div className="pt-2">
            <Input
              id="menu-rename"
              label="Nombre del menú"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
