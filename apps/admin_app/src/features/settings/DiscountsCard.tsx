import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Card, Switch } from '@/components/ui/m3';
import { updateOrganizationDiscounts } from '@/services/organization.service';
import type { OrganizationDiscount } from '@/types/organization';

const schema = z.object({
  discounts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1, 'Nombre requerido'),
        percent: z.number({ message: 'Número requerido' }).gt(0, 'Mayor que 0').max(100, 'Máximo 100'),
        active: z.boolean(),
        requiresId: z.boolean(),
      }),
    )
    .max(20),
});
type Values = z.infer<typeof schema>;

/** Stable id from the name; suffixed when it collides with an existing one. */
function newId(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'descuento';
  let id = base;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

const errorMessage = (e: unknown): string => (e instanceof Error && e.message ? e.message : 'No se pudo guardar los descuentos.');

export function DiscountsCard({ orgId, initial, canEdit }: { orgId: string; initial: OrganizationDiscount[] | undefined; canEdit: boolean }) {
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { discounts: initial ?? [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'discounts' });

  const onSubmit = async (values: Values) => {
    setSaveError('');
    setSaved(false);
    const taken: string[] = [];
    const discounts = values.discounts.map((d) => {
      const id = d.id || newId(d.name, taken);
      taken.push(id);
      return { ...d, id };
    });
    try {
      await updateOrganizationDiscounts(orgId, discounts);
      reset({ discounts });
      setSaved(true);
    } catch (e) {
      setSaveError(errorMessage(e));
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
            <Icon name="percent" size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="t-title-large text-[var(--md-sys-color-on-surface)]">Descuentos</h3>
            <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">
              El mesero los aplica al cobrar. Se reflejan en el total, el ticket y la factura electrónica. Un solo descuento por pedido.
            </p>
          </div>
        </div>

        <fieldset disabled={!canEdit || isSubmitting} className="space-y-6">
          {fields.length === 0 && (
            <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">Aún no hay descuentos configurados.</p>
          )}
          {fields.map((f, i) => (
            <div key={f.id} className="space-y-4 rounded-xl border border-[var(--md-sys-color-outline-variant)] p-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Input id={`disc-name-${i}`} label="Nombre" placeholder="Jubilados" error={errors.discounts?.[i]?.name?.message} {...register(`discounts.${i}.name`)} />
                <Input
                  id={`disc-pct-${i}`}
                  label="Porcentaje"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  error={errors.discounts?.[i]?.percent?.message}
                  {...register(`discounts.${i}.percent`, { valueAsNumber: true })}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3">
                  <Controller
                    name={`discounts.${i}.requiresId`}
                    control={control}
                    render={({ field }) => <Switch id={`disc-id-${i}`} checked={field.value} onChange={field.onChange} label="Exige cédula o carné" />}
                  />
                  <span className="t-body-medium">Exige cédula o carné</span>
                </label>
                <label className="flex items-center gap-3">
                  <Controller
                    name={`discounts.${i}.active`}
                    control={control}
                    render={({ field }) => <Switch id={`disc-active-${i}`} checked={field.value} onChange={field.onChange} label="Activo" />}
                  />
                  <span className="t-body-medium">Activo</span>
                </label>
                <Button type="button" variant="ghost" icon="delete" onClick={() => remove(i)}>
                  Quitar
                </Button>
              </div>
            </div>
          ))}

          {saveError && <p role="alert" className="t-body-medium rounded-lg bg-[var(--md-sys-color-error-container)] px-3 py-2 text-[var(--md-sys-color-on-error-container)]">{saveError}</p>}
          {saved && !isDirty && <p role="status" className="t-body-medium rounded-lg bg-[var(--md-sys-color-primary-container)] px-3 py-2 text-[var(--md-sys-color-on-primary-container)]">Descuentos guardados.</p>}

          {canEdit && (
            <div className="flex flex-wrap justify-between gap-3">
              <Button
                type="button"
                variant="outlined"
                icon="add"
                onClick={() => append({ id: '', name: '', percent: 0, active: true, requiresId: false })}
              >
                Agregar descuento
              </Button>
              <Button type="submit" icon="save" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          )}
        </fieldset>
      </form>
    </Card>
  );
}
