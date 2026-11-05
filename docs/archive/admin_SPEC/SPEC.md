# SPEC — apps/admin_app
# React + TypeScript. Panel de administración web.
# Lee CLAUDE.md y FIREBASE_SCHEMA.md antes de empezar.
# Esta app NO es Flutter. Es React con Vite.

---

## Identidad

- Usuarios: administradores y managers de restaurantes
- Plataforma: browser (Chrome, Safari, Firefox) — desktop y tablet
- Login: email + password (Firebase Auth)

---

## Setup inicial del proyecto

```bash
# Crear el proyecto dentro de apps/
cd apps
npm create vite@latest admin_app -- --template react-ts
cd admin_app
npm install

# Firebase
npm install firebase

# Estado y datos
npm install @tanstack/react-query @tanstack/react-router

# Formularios
npm install react-hook-form zod @hookform/resolvers

# UI base
npm install tailwindcss @tailwindcss/vite
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-switch
npm install @radix-ui/react-tabs @radix-ui/react-toast
npm install @radix-ui/react-avatar @radix-ui/react-tooltip

# Gráficas
npm install recharts

# Utilidades
npm install clsx tailwind-merge lucide-react date-fns

# Dev
npm install -D @types/node
```

---

## Estructura de archivos

```
admin_app/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    │
    ├── lib/
    │   ├── firebase.ts          ← inicialización de Firebase
    │   ├── firestore-paths.ts   ← rutas de colecciones (ver FIREBASE_SCHEMA.md)
    │   └── utils.ts             ← cn() helper para tailwind
    │
    ├── types/
    │   ├── organization.ts
    │   ├── branch.ts
    │   ├── menu.ts
    │   ├── product.ts
    │   ├── order.ts
    │   ├── order-item.ts
    │   ├── table.ts
    │   ├── station.ts
    │   └── user.ts
    │
    ├── services/                ← toda la lógica de Firebase aquí
    │   ├── auth.service.ts
    │   ├── menu.service.ts
    │   ├── order.service.ts
    │   ├── table.service.ts
    │   ├── station.service.ts
    │   └── user.service.ts
    │
    ├── hooks/                   ← React Query hooks
    │   ├── use-auth.ts
    │   ├── use-menu.ts
    │   ├── use-orders.ts
    │   ├── use-tables.ts
    │   └── use-stations.ts
    │
    ├── store/
    │   └── session.store.ts     ← Zustand o Context para sesión activa
    │
    ├── router/
    │   └── index.tsx            ← TanStack Router
    │
    ├── layouts/
    │   ├── auth-layout.tsx      ← solo el login
    │   └── admin-layout.tsx     ← sidebar + contenido
    │
    ├── components/
    │   └── ui/                  ← componentes base reutilizables
    │       ├── button.tsx
    │       ├── input.tsx
    │       ├── badge.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       └── data-table.tsx
    │
    └── features/
        ├── auth/
        │   └── LoginPage.tsx
        ├── dashboard/
        │   ├── DashboardPage.tsx
        │   ├── components/
        │   │   ├── StatsCards.tsx
        │   │   ├── ActiveOrdersList.tsx
        │   │   └── SalesChart.tsx
        ├── menu/
        │   ├── MenuPage.tsx
        │   ├── CategoryList.tsx
        │   ├── ProductList.tsx
        │   ├── ProductFormDialog.tsx
        │   └── ModifierGroupEditor.tsx
        ├── tables/
        │   ├── TablesPage.tsx
        │   ├── TableCard.tsx
        │   └── QrPreviewDialog.tsx
        ├── stations/
        │   └── StationsPage.tsx
        ├── users/
        │   ├── UsersPage.tsx
        │   └── UserFormDialog.tsx
        ├── orders/
        │   ├── OrdersPage.tsx
        │   └── OrderDetailDialog.tsx
        └── reports/
            └── ReportsPage.tsx
```

---

## lib/firebase.ts

```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  // Leer de variables de entorno. NUNCA hardcodear aquí.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');
```

---

## lib/firestore-paths.ts (idéntico al de FIREBASE_SCHEMA.md)

```typescript
// src/lib/firestore-paths.ts
export const paths = {
  organizations: 'organizations',
  branches:      'branches',
  menus:         'menus',
  categories:    'categories',
  products:      'products',
  tables:        'tables',
  stations:      'stations',
  orders:        'orders',
  orderItems:    'order_items',
  users:         'users',
} as const;
```

---

## Tipos TypeScript (espejo exacto del FIREBASE_SCHEMA.md)

```typescript
// src/types/product.ts
export interface ModifierOption {
  id: string;
  name: string;
  extraPrice: number;
  isDefault: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  orgId: string;
  menuId: string;
  categoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  tags: string[];
  modifierGroups: ModifierGroup[];
  preparationMinutes?: number;
}

// src/types/order.ts
export type OrderStatus =
  | 'pending' | 'confirmed' | 'in_preparation'
  | 'ready' | 'delivered' | 'cancelled' | 'closed';

export interface Order {
  id: string;
  orgId: string;
  branchId: string;
  tableId: string;
  tableNumber: string;
  status: OrderStatus;
  subtotal: number;
  taxAmount: number;
  taxPercent: number;
  tipAmount: number;
  total: number;
  notes?: string;
  itemCount: number;
  payment: {
    method?: string;
    status?: string;
    paidAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

---

## Patrón de service + hook (ejemplo: productos)

```typescript
// src/services/menu.service.ts
import { db } from '@/lib/firebase';
import { paths } from '@/lib/firestore-paths';
import {
  collection, query, where, orderBy,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore';
import type { Product } from '@/types/product';

export function watchProducts(
  menuId: string,
  categoryId: string,
  callback: (products: Product[]) => void
) {
  const q = query(
    collection(db, paths.products),
    where('categoryId', '==', categoryId),
    where('menuId', '==', menuId),
    orderBy('sortOrder')
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
  });
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, paths.products), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>
): Promise<void> {
  await updateDoc(doc(db, paths.products, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleProduct(id: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, paths.products, id), { isActive });
}
```

```typescript
// src/hooks/use-menu.ts
import { useState, useEffect } from 'react';
import { watchProducts } from '@/services/menu.service';
import type { Product } from '@/types/product';

export function useProducts(menuId: string, categoryId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!menuId || !categoryId) return;
    setLoading(true);
    const unsubscribe = watchProducts(menuId, categoryId, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return unsubscribe; // cleanup — cancelar listener al desmontar
  }, [menuId, categoryId]);

  return { products, loading, error };
}
```

---

## Routing (TanStack Router)

```typescript
// src/router/index.tsx
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import AdminLayout from '@/layouts/admin-layout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import MenuPage from '@/features/menu/MenuPage';
import TablesPage from '@/features/tables/TablesPage';
import StationsPage from '@/features/stations/StationsPage';
import UsersPage from '@/features/users/UsersPage';
import OrdersPage from '@/features/orders/OrdersPage';
import ReportsPage from '@/features/reports/ReportsPage';
import LoginPage from '@/features/auth/LoginPage';

const rootRoute = createRootRoute();
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: AdminLayout });
const dashboardRoute = createRoute({ getParentRoute: () => adminRoute, path: '/', component: DashboardPage });
const menuRoute = createRoute({ getParentRoute: () => adminRoute, path: '/menu', component: MenuPage });
const tablesRoute = createRoute({ getParentRoute: () => adminRoute, path: '/tables', component: TablesPage });
const stationsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/stations', component: StationsPage });
const usersRoute = createRoute({ getParentRoute: () => adminRoute, path: '/users', component: UsersPage });
const ordersRoute = createRoute({ getParentRoute: () => adminRoute, path: '/orders', component: OrdersPage });
const reportsRoute = createRoute({ getParentRoute: () => adminRoute, path: '/reports', component: ReportsPage });
```

---

## Módulos en orden de prioridad

1. **Login + Auth** — sin esto nada funciona
2. **Layout + navegación** — shell con sidebar
3. **Gestión de menú** — categorías + productos + modificadores (más usado)
4. **Gestión de mesas + QR**
5. **Gestión de usuarios** (llama a Cloud Function `createOperatorUser`)
6. **Dashboard** — stats en tiempo real
7. **Pedidos** — historial y detalle
8. **Estaciones** — configurar qué categorías van a qué estación
9. **Reportes**

---

## Crear usuario (Cloud Function)

```typescript
// Nunca crear usuarios de Firebase Auth desde el cliente directamente.
// Siempre usar esta Cloud Function:

import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const createOperatorUser = httpsCallable(functions, 'createOperatorUser');

await createOperatorUser({
  email,
  displayName,
  orgId,
  branchIds,
  role: 'operator',
  stationId,    // solo si role == 'operator'
});
```

---

## Reglas específicas de esta app

- Archivo `.env.local` para credenciales de Firebase (no commitear)
- Las variables de entorno llevan prefijo `VITE_`
- Usar `cn()` de `clsx + tailwind-merge` para clases condicionales
- Todos los forms usan `react-hook-form` + `zod` para validación
- Los listeners de Firestore se cancelan en el cleanup de `useEffect`
- Imágenes de productos: subir a Firebase Storage. Guardar solo la URL en Firestore.

---

## Orden de implementación

1. Vite setup + tailwind + estructura de carpetas
2. lib/firebase.ts + lib/firestore-paths.ts
3. types/ (todos los tipos TypeScript)
4. features/auth/LoginPage.tsx + hooks/use-auth.ts
5. layouts/admin-layout.tsx con sidebar responsive
6. router/index.tsx con todas las rutas (páginas vacías están bien)
7. **features/menu/** completo (PRIORIDAD 1)
8. **features/tables/** + QrPreviewDialog
9. **features/users/** + llamada a Cloud Function
10. **features/dashboard/** con stats y lista de pedidos activos
11. features/orders/
12. features/stations/
13. features/reports/
