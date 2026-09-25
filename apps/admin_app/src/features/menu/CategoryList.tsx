import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Category } from '@/types/menu';

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
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
      <div className="flex items-center justify-center py-8" role="status" aria-label="Cargando categorías">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--md-sys-color-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pl-3">
        <h3 className="t-title-small text-[var(--md-sys-color-on-surface-variant)]">Categorías</h3>
        <IconButton icon="add" label="Nueva categoría" onClick={() => setIsAdding(true)} />
      </div>

      {isAdding && (
        <div className="flex items-center gap-1 pb-2 pt-3">
          <div className="min-w-0 flex-1">
            <Input
              id="category-new"
              label="Nueva categoría"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de categoría"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsAdding(false);
              }}
            />
          </div>
          <Button size="sm" className="px-3" onClick={handleCreate}>
            Crear
          </Button>
          <IconButton icon="close" label="Cancelar" onClick={() => setIsAdding(false)} />
        </div>
      )}

      <ul className="space-y-0.5">
        {categories.map((cat) => {
          const selected = selectedId === cat.id;
          if (editingId === cat.id) {
            return (
              <li key={cat.id} className="flex items-center gap-1 py-2">
                <div className="min-w-0 flex-1">
                  <Input
                    id={`category-edit-${cat.id}`}
                    label="Nombre"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdate(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                </div>
                <Button size="sm" className="px-3" onClick={() => handleUpdate(cat.id)}>
                  OK
                </Button>
                <IconButton icon="close" label="Cancelar" onClick={() => setEditingId(null)} />
              </li>
            );
          }
          return (
            <li
              key={cat.id}
              className={cn(
                'group flex h-14 items-center rounded-full pr-1',
                selected
                  ? 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]'
                  : 'text-[var(--md-sys-color-on-surface-variant)]',
              )}
            >
              <button
                type="button"
                aria-current={selected ? 'true' : undefined}
                onClick={() => onSelect(cat.id)}
                className="m3-state flex h-full min-w-0 flex-1 flex-col items-start justify-center rounded-full pl-4 pr-2 text-left"
              >
                <span className={cn('t-label-large w-full truncate', !cat.isActive && 'opacity-60')}>{cat.name}</span>
                {!cat.isActive && <span className="t-label-small opacity-80">Oculta</span>}
              </button>
              {/* Touch screens have no hover: the selected category always shows its actions. */}
              <span
                className={cn(
                  'shrink-0 items-center',
                  selected ? 'flex' : 'hidden group-hover:flex group-focus-within:flex',
                )}
              >
                <IconButton
                  icon="edit"
                  label="Renombrar categoría"
                  className="text-current"
                  onClick={() => startEdit(cat)}
                />
                <IconButton
                  icon={cat.isActive ? 'visibility_off' : 'visibility'}
                  label={cat.isActive ? 'Desactivar categoría' : 'Activar categoría'}
                  className="text-current"
                  onClick={() => onToggle(cat.id, !cat.isActive)}
                />
                <IconButton
                  icon="delete"
                  label="Eliminar categoría"
                  className="text-[var(--md-sys-color-error)]"
                  onClick={() => onDelete(cat.id)}
                />
              </span>
            </li>
          );
        })}
      </ul>

      {categories.length === 0 && !isAdding && (
        <p className="t-body-medium px-3 py-4 text-center text-[var(--md-sys-color-on-surface-variant)]">
          Sin categorías. Crea la primera.
        </p>
      )}
    </div>
  );
}
