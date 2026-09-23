import { useState, useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import ModifierGroupEditor from './ModifierGroupEditor';
import type { Product, ModifierGroup } from '@/types/product';

const modifierOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nombre requerido'),
  extraPrice: z.number().min(0),
  isDefault: z.boolean(),
});

const modifierGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nombre del grupo requerido'),
  required: z.boolean(),
  multiSelect: z.boolean(),
  minSelect: z.number().min(0),
  maxSelect: z.number().min(1),
  options: z.array(modifierOptionSchema).min(1, 'Al menos una opción'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    // Empty number inputs arrive as NaN (valueAsNumber) → treat like a missing price.
    z
      .number({
        error: (iss) =>
          iss.input === undefined || Number.isNaN(iss.input) ? 'Precio requerido' : 'Precio debe ser un número',
      })
      .min(0, 'Precio debe ser >= 0'),
  ),
  tags: z.string().optional(),
  preparationMinutes: z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  modifierGroups: z.array(modifierGroupSchema),
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormValues = z.output<typeof productSchema>;

interface ProductFormDialogProps {
  product: Product | null;
  orgId: string;
  menuId: string;
  categoryId: string;
  onSave: (data: Omit<Product, 'id'>) => Promise<unknown>;
  onUpdate: (id: string, data: Partial<Product>) => Promise<void>;
  onClose: () => void;
}

export default function ProductFormDialog({
  product,
  orgId,
  menuId,
  categoryId,
  onSave,
  onUpdate,
  onClose,
}: ProductFormDialogProps) {
  const isEditing = product !== null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: undefined,
      tags: '',
      preparationMinutes: undefined,
      imageUrl: '',
      modifierGroups: [],
    },
  });
  const imageUrl = useWatch({ control, name: 'imageUrl' });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        price: product.price,
        tags: (product.tags ?? []).join(', '),
        preparationMinutes: product.preparationMinutes,
        imageUrl: product.imageUrl ?? '',
        modifierGroups: product.modifierGroups ?? [],
      });
    }
  }, [product, reset]);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitError(null);
    const tags = values.tags
      ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    // Editable fields only; orgId/menuId/categoryId are set on create and never updated.
    const fields: Omit<Product, 'id' | 'orgId' | 'menuId' | 'categoryId'> = {
      name: values.name,
      price: values.price,
      isActive: product?.isActive ?? true,
      sortOrder: product?.sortOrder ?? 0,
      tags,
      modifierGroups: values.modifierGroups as ModifierGroup[],
    };
    if (values.description) fields.description = values.description;
    if (values.preparationMinutes != null) fields.preparationMinutes = values.preparationMinutes;
    if (values.imageUrl) fields.imageUrl = values.imageUrl;

    try {
      if (isEditing) {
        await onUpdate(product.id, fields);
      } else {
        await onSave({ orgId, menuId, categoryId, ...fields });
      }
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar producto';
      setSubmitError(message);
    }
  };

  return (
    <Dialog
      title={isEditing ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      className="sm:max-w-2xl"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear producto'}
          </Button>
        </>
      }
    >
      <div className="space-y-5 pt-2">
        <Input
          id="name"
          label="Nombre"
          isRequired
          placeholder="Ej: Hamburguesa clásica"
          error={errors.name?.message}
          {...register('name')}
        />

        <Textarea
          id="description"
          label="Descripción"
          rows={2}
          placeholder="Descripción opcional del producto"
          {...register('description')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="price"
            label="Precio"
            isRequired
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.price?.message}
            {...register('price', { valueAsNumber: true })}
          />
          <Input
            id="preparationMinutes"
            label="Tiempo de preparación (min)"
            type="number"
            min="0"
            placeholder="15"
            {...register('preparationMinutes', { valueAsNumber: true })}
          />
        </div>

        <Input
          id="tags"
          label="Tags"
          placeholder="vegetariano, sin_gluten, picante"
          supporting="Separados por coma"
          {...register('tags')}
        />

        <div className="space-y-3">
          <Input
            id="imageUrl"
            label="URL de imagen"
            type="url"
            placeholder="https://..."
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Vista previa"
              className="h-32 w-full rounded-xl border border-[var(--md-sys-color-outline-variant)] object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'block';
              }}
            />
          ) : (
            <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-xl bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface-variant)]">
              <Icon name="image" size={32} />
              <span className="t-body-small">Sin imagen</span>
            </div>
          )}
        </div>

        <hr className="border-[var(--md-sys-color-outline-variant)]" />

        <Controller
          name="modifierGroups"
          control={control}
          render={({ field }) => (
            <ModifierGroupEditor
              groups={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {errors.modifierGroups && (
          <p className="t-body-medium rounded-xl bg-[var(--md-sys-color-error-container)] p-3 text-[var(--md-sys-color-on-error-container)]">
            Revisa los modificadores: cada grupo necesita nombre y al menos una opción con nombre.
          </p>
        )}

        {submitError && (
          <p className="t-body-medium rounded-xl bg-[var(--md-sys-color-error-container)] p-3 text-[var(--md-sys-color-on-error-container)]">
            {submitError}
          </p>
        )}
      </div>
    </Dialog>
  );
}
