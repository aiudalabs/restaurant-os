import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ModifierGroup, ModifierOption } from '@/types/product';

interface ModifierGroupEditorProps {
  groups: ModifierGroup[];
  onChange: (groups: ModifierGroup[]) => void;
}

function generateId() {
  return crypto.randomUUID();
}

function emptyOption(): ModifierOption {
  return { id: generateId(), name: '', extraPrice: 0, isDefault: false };
}

function emptyGroup(): ModifierGroup {
  return {
    id: generateId(),
    name: '',
    required: false,
    multiSelect: false,
    minSelect: 0,
    maxSelect: 1,
    options: [emptyOption()],
  };
}

export default function ModifierGroupEditor({
  groups,
  onChange,
}: ModifierGroupEditorProps) {
  const updateGroup = (index: number, partial: Partial<ModifierGroup>) => {
    const updated = groups.map((g, i) => (i === index ? { ...g, ...partial } : g));
    onChange(updated);
  };

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index));
  };

  const addGroup = () => {
    onChange([...groups, emptyGroup()]);
  };

  const updateOption = (
    groupIndex: number,
    optionIndex: number,
    partial: Partial<ModifierOption>,
  ) => {
    const updated = groups.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return {
        ...g,
        options: g.options.map((o, oi) =>
          oi === optionIndex ? { ...o, ...partial } : o,
        ),
      };
    });
    onChange(updated);
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const updated = groups.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return { ...g, options: g.options.filter((_, oi) => oi !== optionIndex) };
    });
    onChange(updated);
  };

  const addOption = (groupIndex: number) => {
    const updated = groups.map((g, gi) => {
      if (gi !== groupIndex) return g;
      return { ...g, options: [...g.options, emptyOption()] };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Grupos de modificadores
        </h4>
        <Button variant="ghost" size="sm" onClick={addGroup} type="button">
          <Plus className="mr-1 h-4 w-4" />
          Agregar grupo
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-2">
          Sin modificadores. Ejemplo: "Término de cocción", "Extras".
        </p>
      )}

      {groups.map((group, gi) => (
        <div
          key={group.id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-300 shrink-0" />
            <Input
              value={group.name}
              onChange={(e) => updateGroup(gi, { name: e.target.value })}
              placeholder="Nombre del grupo (ej: Término)"
              className="h-8 text-sm flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-500 hover:text-red-700"
              onClick={() => removeGroup(gi)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={group.required}
                onChange={(e) => updateGroup(gi, { required: e.target.checked })}
                className="rounded border-gray-300"
              />
              Obligatorio
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={group.multiSelect}
                onChange={(e) =>
                  updateGroup(gi, { multiSelect: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              Multi-selección
            </label>
            {group.multiSelect && (
              <>
                <label className="flex items-center gap-1.5">
                  Mín:
                  <input
                    type="number"
                    min={0}
                    value={group.minSelect}
                    onChange={(e) =>
                      updateGroup(gi, { minSelect: Number(e.target.value) })
                    }
                    className="w-14 rounded border border-gray-300 px-2 py-0.5 text-sm"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  Máx:
                  <input
                    type="number"
                    min={1}
                    value={group.maxSelect}
                    onChange={(e) =>
                      updateGroup(gi, { maxSelect: Number(e.target.value) })
                    }
                    className="w-14 rounded border border-gray-300 px-2 py-0.5 text-sm"
                  />
                </label>
              </>
            )}
          </div>

          {/* Options */}
          <div className="space-y-1.5 pl-6">
            {group.options.map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <Input
                  value={opt.name}
                  onChange={(e) =>
                    updateOption(gi, oi, { name: e.target.value })
                  }
                  placeholder="Opción (ej: Término medio)"
                  className="h-7 text-sm flex-1"
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={opt.extraPrice}
                  onChange={(e) =>
                    updateOption(gi, oi, {
                      extraPrice: Number(e.target.value),
                    })
                  }
                  placeholder="$0.00"
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={opt.isDefault}
                    onChange={(e) =>
                      updateOption(gi, oi, { isDefault: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  Default
                </label>
                <button
                  type="button"
                  onClick={() => removeOption(gi, oi)}
                  className="p-0.5 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => addOption(gi)}
              type="button"
            >
              <Plus className="mr-1 h-3 w-3" />
              Opción
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
