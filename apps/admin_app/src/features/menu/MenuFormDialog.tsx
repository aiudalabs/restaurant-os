import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';

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
    <Dialog
      title="Nuevo menú"
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      className="sm:max-w-sm"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear menú'}
          </Button>
        </>
      }
    >
      <Input
        id="menu-name"
        label="Nombre del menú"
        placeholder="Menú principal"
        error={errors.name?.message}
        {...register('name')}
      />
    </Dialog>
  );
}
