import type { Category } from '@/types/menu';
import { isEmptySetup } from './data';

const READ_ONLY = 'El modo demo es de solo lectura.';

export function watchCategories(menuId: string, callback: (categories: Category[]) => void) {
  const rows = isEmptySetup() || !menuId ? [] : [{ id: 'c1', name: 'Pizzas' }, { id: 'c2', name: 'Bebidas' }];
  const timer = window.setTimeout(() => callback(rows as unknown as Category[]), 80);
  return () => window.clearTimeout(timer);
}

export function watchMenus(_orgId: string, callback: (menus: never[]) => void) {
  const timer = window.setTimeout(() => callback([]), 80);
  return () => window.clearTimeout(timer);
}

export function watchProducts(_menuId: string, _categoryId: string, callback: (products: never[]) => void) {
  const timer = window.setTimeout(() => callback([]), 80);
  return () => window.clearTimeout(timer);
}

const readOnly = async () => {
  throw new Error(READ_ONLY);
};
export const countProductsInCategory = async () => 0;
export const fetchProductsByCategory = async () => [];
export const createMenu = readOnly;
export const updateMenu = readOnly;
export const deleteMenu = readOnly;
export const createCategory = readOnly;
export const updateCategory = readOnly;
export const deleteCategory = readOnly;
export const createProduct = readOnly;
export const updateProduct = readOnly;
export const toggleProduct = readOnly;
export const deleteProduct = readOnly;
