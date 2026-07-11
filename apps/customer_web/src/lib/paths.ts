// Single source of Firestore collection paths — mirrors packages/core
// FirestorePaths and admin_app firestore-paths.ts. Flat multi-tenant schema.
export const paths = {
  organizations: 'organizations',
  branches: 'branches',
  menus: 'menus',
  categories: 'categories',
  products: 'products',
  tables: 'tables',
  stations: 'stations',
  orders: 'orders',
  orderItems: 'order_items',
  users: 'users',
} as const;
