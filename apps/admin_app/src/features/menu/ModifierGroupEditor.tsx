import type { ReactNode } from 'react';
import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/m3';
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

interface CheckboxFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** Native checkbox with a 40dp-tall touch target and M3 colors. */
function CheckboxField({ checked, onChange, children }: CheckboxFieldProps) {
  return (
    <label className="t-body-medium inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap text-[var(--md-sys-color-on-surface)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] cursor-pointer accent-[var(--md-sys-color-primary)]"
      />
      {children}
    </label>
  );
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="t-title-medium text-[var(--md-sys-color-on-surface)]">Grupos de modificadores</h4>
        <Button variant="ghost" icon="add" onClick={addGroup} type="button">
          Agregar grupo
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="t-body-medium py-2 text-center text-[var(--md-sys-color-on-surface-variant)]">
          Sin modificadores. Ejemplo: "Término de cocción", "Extras".
        </p>
      )}

      {groups.map((group, gi) => (
        <Card key={group.id} variant="filled" className="space-y-3 p-4">
          <div className="flex items-center gap-2 pt-2">
            <Icon name="drag_indicator" size={20} className="shrink-0 text-[var(--md-sys-color-on-surface-variant)]" />
            <div className="min-w-0 flex-1">
              <Input
                id={`group-name-${group.id}`}
                label="Nombre del grupo"
                value={group.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                placeholder="Ej: Término"
              />
            </div>
            <IconButton
              icon="delete"
              label="Eliminar grupo"
              className="text-[var(--md-sys-color-error)]"
              onClick={() => removeGroup(gi)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <CheckboxField checked={group.required} onChange={(required) => updateGroup(gi, { required })}>
              Obligatorio
            </CheckboxField>
            <CheckboxField checked={group.multiSelect} onChange={(multiSelect) => updateGroup(gi, { multiSelect })}>
              Multi-selección
            </CheckboxField>
            {group.multiSelect && (
              <div className="flex gap-3 pt-2">
                <div className="w-24">
                  <Input
                    id={`group-min-${group.id}`}
                    label="Mín"
                    type="number"
                    min={0}
                    value={group.minSelect}
                    onChange={(e) => updateGroup(gi, { minSelect: Number(e.target.value) })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    id={`group-max-${group.id}`}
                    label="Máx"
                    type="number"
                    min={1}
                    value={group.maxSelect}
                    onChange={(e) => updateGroup(gi, { maxSelect: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Options. Phones: option name on its own row, price/default/delete below. */}
          <div className="space-y-4 pt-1 sm:pl-7">
            {(group.options ?? []).map((opt, oi) => (
              <div key={opt.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                  <Input
                    id={`option-name-${opt.id}`}
                    label="Opción"
                    value={opt.name}
                    onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                    placeholder="Ej: Término medio"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Input
                    id={`option-price-${opt.id}`}
                    label="Precio extra"
                    type="number"
                    min={0}
                    step={0.01}
                    value={opt.extraPrice}
                    onChange={(e) => updateOption(gi, oi, { extraPrice: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <CheckboxField checked={opt.isDefault} onChange={(isDefault) => updateOption(gi, oi, { isDefault })}>
                  Por defecto
                </CheckboxField>
                <IconButton
                  icon="delete"
                  label="Eliminar opción"
                  className="ml-auto text-[var(--md-sys-color-error)] sm:ml-0"
                  onClick={() => removeOption(gi, oi)}
                />
              </div>
            ))}
            <Button variant="ghost" icon="add" size="sm" onClick={() => addOption(gi)} type="button">
              Agregar opción
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
