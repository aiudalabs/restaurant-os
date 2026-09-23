import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types/menu';

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  loading: boolean;
}

export default function CategoryList({
  categories,
  selectedId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
  loading,
}: CategoryListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName('');
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdate(id, editName.trim());
    setEditingId(null);
    setEditName('');
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Categorías
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-10 w-10 p-0 sm:h-7 sm:w-7"
          aria-label="Nueva categoría"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isAdding && (
        <div className="flex items-start gap-2 px-1">
          <div className="min-w-0 flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de categoría"
              className="h-10 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
          </div>
          <Button size="sm" className="h-10" onClick={handleCreate}>
            Crear
          </Button>
        </div>
      )}

      <ul className="space-y-0.5">
        {categories.map((cat) => (
          <li key={cat.id}>
            {editingId === cat.id ? (
              <div className="flex items-start gap-2 px-1">
                <div className="min-w-0 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                </div>
                <Button size="sm" className="h-10" onClick={() => handleUpdate(cat.id)}>
                  OK
                </Button>
              </div>
            ) : (
              <button
                onClick={() => onSelect(cat.id)}
                className={cn(
                  'm3-state flex w-full items-center justify-between gap-2 rounded-full px-4 py-2.5 text-sm transition-colors group',
                  selectedId === cat.id
                    ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-semibold'
                    : 'text-gray-700',
                  !cat.isActive && 'opacity-50',
                )}
              >
                <span className="min-w-0 truncate">{cat.name}</span>
                {/* Touch screens have no hover: the selected category always shows its actions. */}
                <span
                  className={cn(
                    'shrink-0 items-center gap-1',
                    selectedId === cat.id ? 'flex' : 'hidden group-hover:flex',
                  )}
                >
                  <span
                    role="button"
                    className="m3-state rounded-full p-2 sm:p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(cat);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    className="m3-state rounded-full px-2 py-1.5 sm:px-1.5 sm:py-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggle(cat.id, !cat.isActive);
                    }}
                  >
                    <span className="text-xs font-semibold">{cat.isActive ? 'OFF' : 'ON'}</span>
                  </span>
                  <span
                    role="button"
                    className="m3-state rounded-full p-2 text-red-500 sm:p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(cat.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {categories.length === 0 && !isAdding && (
        <p className="px-3 py-4 text-sm text-gray-400 text-center">
          Sin categorías. Crea la primera.
        </p>
      )}
    </div>
  );
}
