import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import ModifierGroupEditor from './ModifierGroupEditor';
import { uploadProductImage } from '@/services/storage.service';
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
  waiterNote: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ required_error: 'Precio requerido', invalid_type_error: 'Precio debe ser un número' }).min(0, 'Precio debe ser >= 0'),
  ),
  tags: z.string().optional(),
  preparationMinutes: z.preprocess(
    (val) => (val === '' || val === undefined || Number.isNaN(Number(val)) ? undefined : Number(val)),
    z.number().min(0).optional(),
  ),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  modifierGroups: z.array(modifierGroupSchema),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormDialogProps {
  product: Product | null;
  orgId: string;
  menuId: string;
  categoryId: string;
  onSave: (data: Omit<Product, 'id'>) => Promise<void>;
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      waiterNote: '',
      price: undefined as unknown as number,
      tags: '',
      preparationMinutes: undefined,
      imageUrl: '',
      modifierGroups: [],
    },
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const onPhotoPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadProductImage(orgId, file);
      setValue('imageUrl', url, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        waiterNote: product.waiterNote ?? '',
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

    const productData: Omit<Product, 'id'> = {
      orgId,
      menuId,
      categoryId,
      name: values.name,
      price: values.price,
      isActive: product?.isActive ?? true,
      sortOrder: product?.sortOrder ?? 0,
      tags,
      modifierGroups: values.modifierGroups as ModifierGroup[],
    };
    if (values.description) productData.description = values.description;
    // Always written so clearing the field removes the note.
    productData.waiterNote = (values.waiterNote ?? '').trim();
    if (values.preparationMinutes != null) productData.preparationMinutes = values.preparationMinutes;
    if (values.imageUrl) productData.imageUrl = values.imageUrl;

    try {
      if (isEditing) {
        const { orgId: _o, menuId: _m, categoryId: _c, ...updateData } = productData;
        await onUpdate(product.id, updateData);
      } else {
        await onSave(productData);
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
          <Button type="submit" disabled={isSubmitting || uploading}>
            {isSubmitting
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear producto'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          id="name"
          label="Nombre"
          isRequired
          placeholder="Ej: Hamburguesa clásica"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
            Descripción
          </label>
          <textarea
            id="description"
            rows={2}
            className="flex w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 py-2.5 text-[15px] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/60 transition-colors focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]"
            placeholder="Descripción opcional del producto"
            {...register('description')}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="waiterNote" className="block text-sm font-medium text-[var(--color-on-surface-variant)]">
            Observaciones para el mesero
          </label>
          <input
            id="waiterNote"
            className="flex h-12 w-full rounded-xl border border-transparent bg-[var(--color-surface-container-high)] px-4 text-[15px] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/60 transition-colors focus:outline-none focus:border-orange-600 focus:bg-[var(--color-surface-container)]"
            placeholder="Ej: Se le puede agregar pollo"
            {...register('waiterNote')}
          />
          <p className="text-xs text-gray-500">Solo la ve el mesero, en letra chica bajo el nombre. El cliente no la ve.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          label="Tags (separados por coma)"
          placeholder="vegetariano, sin_gluten, picante"
          {...register('tags')}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* accept image/* lets phones offer the camera or the gallery */}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPhotoPicked} />
            <Button
              type="button"
              variant="tonal"
              size="sm"
              disabled={uploading || isSubmitting}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {uploading ? 'Subiendo foto…' : watch('imageUrl') ? 'Cambiar foto' : 'Subir foto'}
            </Button>
            {watch('imageUrl') && !uploading && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setValue('imageUrl', '', { shouldDirty: true })}>
                Quitar
              </Button>
            )}
          </div>
          {uploadError && (
            <p role="alert" className="text-sm text-red-600">
              {uploadError}
            </p>
          )}
          <Input
            id="imageUrl"
            label="O pega la URL de una imagen"
            type="url"
            placeholder="https://..."
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />
          {watch('imageUrl') ? (
            <img
              src={watch('imageUrl')}
              alt="Vista previa"
              className="h-32 w-full rounded-xl border border-[var(--color-outline-variant)] object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'block';
              }}
            />
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-xl bg-[var(--color-surface-container-high)] text-3xl text-gray-400">
              🍽️
            </div>
          )}
        </div>

        <hr className="border-[var(--color-outline-variant)]" />

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

        {submitError && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </div>
    </Dialog>
  );
}
