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
