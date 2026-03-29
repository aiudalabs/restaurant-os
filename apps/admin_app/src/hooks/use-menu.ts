import { useState, useEffect, useCallback } from 'react';
import type { Menu, Category } from '@/types/menu';
import type { Product } from '@/types/product';
import {
  watchMenus,
  createMenu as createMenuService,
  updateMenu as updateMenuService,
  watchCategories,
  createCategory as createCategoryService,
  updateCategory as updateCategoryService,
  deleteCategory as deleteCategoryService,
  watchProducts,
  createProduct as createProductService,
  updateProduct as updateProductService,
  deleteProduct as deleteProductService,
  toggleProduct as toggleProductService,
} from '@/services/menu.service';

// ─── Menus ───

export function useMenus(orgId: string) {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const unsubscribe = watchMenus(orgId, (data) => {
      setMenus(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId]);

  const createMenu = useCallback(
    async (data: Omit<Menu, 'id' | 'createdAt'>) => {
      return createMenuService(data);
    },
    [],
  );

  const updateMenu = useCallback(
    async (id: string, data: Partial<Menu>) => {
      return updateMenuService(id, data);
    },
    [],
  );

  return { menus, loading, createMenu, updateMenu };
}

// ─── Categories ───

export function useCategories(menuId: string) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchCategories(menuId, (data) => {
      setCategories(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [menuId]);

  const createCategory = useCallback(
    async (data: Omit<Category, 'id'>) => {
      return createCategoryService(data);
    },
    [],
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<Category>) => {
      return updateCategoryService(id, data);
    },
    [],
  );

  const deleteCategory = useCallback(async (id: string) => {
    return deleteCategoryService(id);
  }, []);

  return { categories, loading, createCategory, updateCategory, deleteCategory };
}

// ─── Products ───

export function useProducts(menuId: string, categoryId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!menuId || !categoryId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchProducts(menuId, categoryId, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [menuId, categoryId]);

  const createProduct = useCallback(
    async (data: Omit<Product, 'id'>) => {
      return createProductService(data);
    },
    [],
  );

  const updateProduct = useCallback(
    async (id: string, data: Partial<Product>) => {
      return updateProductService(id, data);
    },
    [],
  );

  const toggleProduct = useCallback(
    async (id: string, isActive: boolean) => {
      return toggleProductService(id, isActive);
    },
    [],
  );

  const deleteProduct = useCallback(async (id: string) => {
    return deleteProductService(id);
  }, []);

  return { products, loading, createProduct, updateProduct, toggleProduct, deleteProduct };
}
