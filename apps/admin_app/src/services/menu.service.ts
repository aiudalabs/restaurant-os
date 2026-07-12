import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import type { Menu, Category } from '@/types/menu';
import type { Product } from '@/types/product';

// Delete many docs atomically, chunked under Firestore's 500-op batch limit.
async function cascadeDelete(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db);
    refs.slice(i, i + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/** How many products a category holds — for a confirmation prompt. */
export async function countProductsInCategory(categoryId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, paths.products), where('categoryId', '==', categoryId)),
  );
  return snap.size;
}

// ─── Menus ───

export function watchMenus(
  orgId: string,
  callback: (menus: Menu[]) => void,
) {
  const q = query(
    collection(db, paths.menus),
    where('orgId', '==', orgId),
  );
  return onSnapshot(q, (snap) => {
    const menus = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Menu);
    menus.sort((a, b) => a.name.localeCompare(b.name));
    callback(menus);
  }, (err) => {
    console.error('watchMenus error:', err);
    callback([]);
  });
}

export async function createMenu(data: Omit<Menu, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, paths.menus), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMenu(id: string, data: Partial<Menu>) {
  await updateDoc(doc(db, paths.menus, id), data);
}

export async function deleteMenu(id: string) {
  // Cascade: remove every product and category under the menu, then the menu.
  const [cats, prods] = await Promise.all([
    getDocs(query(collection(db, paths.categories), where('menuId', '==', id))),
    getDocs(query(collection(db, paths.products), where('menuId', '==', id))),
  ]);
  await cascadeDelete([
    ...prods.docs.map((d) => d.ref),
    ...cats.docs.map((d) => d.ref),
    doc(db, paths.menus, id),
  ]);
}

// ─── Categories ───

export function watchCategories(
  menuId: string,
  callback: (categories: Category[]) => void,
) {
  const q = query(
    collection(db, paths.categories),
    where('menuId', '==', menuId),
  );
  return onSnapshot(q, (snap) => {
    const cats = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category);
    cats.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    callback(cats);
  }, (err) => {
    console.error('watchCategories error:', err);
    callback([]);
  });
}

export async function createCategory(
  data: Omit<Category, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.categories), data);
  return ref.id;
}

export async function updateCategory(
  id: string,
  data: Partial<Category>,
) {
  await updateDoc(doc(db, paths.categories, id), data);
}

export async function deleteCategory(id: string) {
  // Cascade: remove the category's products too, so none are left orphaned.
  const prods = await getDocs(
    query(collection(db, paths.products), where('categoryId', '==', id)),
  );
  await cascadeDelete([...prods.docs.map((d) => d.ref), doc(db, paths.categories, id)]);
}

// ─── Products ───

export function watchProducts(
  menuId: string,
  categoryId: string,
  callback: (products: Product[]) => void,
) {
  const q = query(
    collection(db, paths.products),
    where('menuId', '==', menuId),
    where('categoryId', '==', categoryId),
  );
  return onSnapshot(q, (snap) => {
    const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
    prods.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    callback(prods);
  }, (err) => {
    console.error('watchProducts error:', err);
    callback([]);
  });
}

export async function fetchProductsByCategory(
  menuId: string,
  categoryId: string,
): Promise<Product[]> {
  const q = query(
    collection(db, paths.products),
    where('menuId', '==', menuId),
    where('categoryId', '==', categoryId),
  );
  const snap = await getDocs(q);
  const prods = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Product);
  prods.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return prods;
}

export async function createProduct(
  data: Omit<Product, 'id'>,
): Promise<string> {
  const ref = await addDoc(collection(db, paths.products), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>,
) {
  await updateDoc(doc(db, paths.products, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleProduct(id: string, isActive: boolean) {
  await updateDoc(doc(db, paths.products, id), { isActive });
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, paths.products, id));
}
