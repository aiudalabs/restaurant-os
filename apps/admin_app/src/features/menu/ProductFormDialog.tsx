import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      price: undefined as unknown as number,
      tags: '',
      preparationMinutes: undefined,
      imageUrl: '',
      modifierGroups: [],
    },
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        price: product.price,
        tags: product.tags.join(', '),
        preparationMinutes: product.preparationMinutes,
        imageUrl: product.imageUrl ?? '',
        modifierGroups: product.modifierGroups,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input
            id="name"
            label="Nombre"
            isRequired
            placeholder="Ej: Hamburguesa clásica"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="space-y-1">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              rows={2}
              className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Descripción opcional del producto"
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <Input
            id="imageUrl"
            label="URL de imagen"
            type="url"
            placeholder="https://..."
            error={errors.imageUrl?.message}
            {...register('imageUrl')}
          />

          <hr className="border-gray-200" />

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
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Guardando...'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Crear producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
