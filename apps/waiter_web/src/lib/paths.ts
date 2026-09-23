// Single source of Firestore collection paths — mirrors packages/core
// FirestorePaths and admin_app firestore-paths.ts. Flat multi-tenant schema.
export const paths = {
  branches: 'branches',
  categories: 'categories',
  products: 'products',
  orders: 'orders',
  orderItems: 'order_items',
  users: 'users',
} as const;
