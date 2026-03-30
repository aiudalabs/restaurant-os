import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const menuSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
});

type MenuFormValues = z.infer<typeof menuSchema>;

interface MenuFormDialogProps {
  onSave: (data: { orgId: string; name: string; isActive: boolean }) => Promise<string>;
  orgId: string;
  onClose: () => void;
}

export default function MenuFormDialog({ onSave, orgId, onClose }: MenuFormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
  });

  const onSubmit = async (data: MenuFormValues) => {
    await onSave({ orgId, name: data.name, isActive: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nuevo menú</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="menu-name"
            label="Nombre del menú"
            placeholder="Menú principal"
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear menú'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
