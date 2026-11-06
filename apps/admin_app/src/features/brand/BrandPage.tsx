import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useOrganization } from '@/hooks/use-organization';
import { BrandPreview } from './components/BrandPreview';
import { ColorField } from './components/ColorField';
import { FontPicker } from './components/FontPicker';
import { ImageField } from './components/ImageField';
import { explainColor } from './contrast-notes';
import { useBrandFonts } from './hooks/use-brand-fonts';
import { useSaveBranding, useUploadBrandImage } from './hooks/use-brand';
import { EMPTY_FORM, brandSchema, currentBrand, toBranding, toForm, type BrandForm } from './schema';
import { LIMITS, PLATFORM_BRANDING, derivePalette, type Branding } from './theme';
import type { BrandImageKind } from './services/image';

const HEX = /^#[0-9a-fA-F]{6}$/;

function saveErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code ?? '';
  if (code.includes('permission-denied')) {
    return 'Tu usuario no tiene permiso para cambiar la marca, o una de las imágenes no es de tu organización. Vuelve a subirlas e inténtalo de nuevo.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  return err instanceof Error && err.message ? err.message : 'No se pudo guardar la marca. Inténtalo de nuevo.';
}

export default function BrandPage() {
  const { appUser } = useAuth();
  const { branches, loading } = useBranchContext();
  const { organization, loading: orgLoading } = useOrganization(appUser?.orgId ?? '');

  if (appUser?.role !== 'admin') {
    return (
      <EmptyState
        icon="lock"
        title="Solo el dueño puede cambiar la marca"
        body="Pídele al dueño de la cuenta que entre a esta pantalla para cambiar el nombre, el logo y los colores."
      />
    );
  }
  if (loading || orgLoading) {
    return (
      <div role="status" className="flex items-center gap-3 py-12 text-[var(--ink-soft)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
        <span className="t-body-medium">Cargando tu marca…</span>
      </div>
    );
  }
  if (branches.length === 0) {
    return (
      <EmptyState
        icon="storefront"
        title="Primero crea una sucursal"
        body="La marca se aplica a las sucursales de tu organización. Crea la primera en Sucursales y vuelve aquí."
      />
    );
  }
  return <BrandEditor orgId={appUser.orgId} orgName={organization?.name ?? ''} />;
}

function BrandEditor({ orgId, orgName }: { orgId: string; orgName: string }) {
  useBrandFonts();
  const { branches, selectedBranch } = useBranchContext();
  const stored = useMemo(() => currentBrand(branches), [branches]);

  const form = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    mode: 'onChange',
    defaultValues: stored.branding ? toForm(stored.branding) : { ...EMPTY_FORM, displayName: orgName },
  });
  const { control, handleSubmit, setValue, formState } = form;
  const values = useWatch({ control });

  const upload = useUploadBrandImage(orgId);
  const save = useSaveBranding(branches.map((b) => b.id));
  const [imageErrors, setImageErrors] = useState<Partial<Record<BrandImageKind, string>>>({});
  const [busyKind, setBusyKind] = useState<BrandImageKind | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // What customers will actually see: invalid fields fall back to the platform values so the
  // preview never breaks while the owner is still typing.
  const primary = HEX.test(values.primary ?? '') ? values.primary! : PLATFORM_BRANDING.primary;
  const accent = HEX.test(values.accent ?? '') ? values.accent! : PLATFORM_BRANDING.accent;
  const shown: Branding = {
    displayName: values.displayName?.trim() || 'Tu restaurante',
    primary,
    accent,
    fontPreset: values.fontPreset ?? PLATFORM_BRANDING.fontPreset,
    logoUrl: values.logoUrl ?? '',
    iconUrl: values.iconUrl ?? '',
  };
  const palette = useMemo(() => derivePalette(primary, accent), [primary, accent]);
  const primaryNote = explainColor('primary', primary, palette.brand);
  const accentNote = explainColor('accent', accent, palette.accent);

  const pickImage = (kind: BrandImageKind, file: File) => {
    setImageErrors((e) => ({ ...e, [kind]: undefined }));
    setBusyKind(kind);
    upload.mutate(
      { kind, file },
      {
        onSuccess: (url) => {
          setValue(kind === 'logo' ? 'logoUrl' : 'iconUrl', url, { shouldValidate: true, shouldDirty: true });
          setSavedCount(null);
        },
        onError: (err) => setImageErrors((e) => ({ ...e, [kind]: err instanceof Error ? err.message : 'No se pudo subir la imagen.' })),
        onSettled: () => setBusyKind(null),
      },
    );
  };

  const onSubmit = handleSubmit((data) => {
    setSavedCount(null);
    save.mutate(toBranding(data), { onSuccess: (count) => setSavedCount(count) });
  });

  const missing = [!values.logoUrl && 'el logo', !values.iconUrl && 'el ícono'].filter(Boolean).join(' y ');
  const branchNames = branches.map((b) => b.name).join(', ');

  return (
    <div className="grid gap-10 pb-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={onSubmit} noValidate className="min-w-0 max-w-2xl space-y-8">
        {stored.branding ? (
          <p className="t-body-medium text-[var(--ink-soft)]">
            Así ven tus clientes tu restaurante al pedir. Los cambios se ven en la vista previa antes de guardar.
          </p>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl bg-[var(--brand-wash)] p-4 text-[var(--ink)]">
            <Icon name="palette" className="mt-0.5 text-[var(--brand-ink)]" />
            <div className="space-y-1">
              <p className="t-title-small">Aún no tienes marca</p>
              <p className="t-body-medium text-[var(--ink-soft)]">
                Tus clientes ven hoy el tema neutro de la plataforma. Elige tu nombre, logo y colores; verás cómo queda en la vista previa antes
                de guardar.
              </p>
            </div>
          </div>
        )}

        <section aria-labelledby="brand-name" className="space-y-5">
          <h2 id="brand-name" className="t-title-medium text-[var(--ink)]">Nombre</h2>
          <Controller
            control={control}
            name="displayName"
            render={({ field }) => (
              <Input
                id="displayName"
                label="Nombre del restaurante"
                isRequired
                maxLength={LIMITS.displayName}
                autoComplete="organization"
                error={formState.errors.displayName?.message}
                supporting={`${field.value.length} de ${LIMITS.displayName}. Sale en el título de la página y en la app instalada.`}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="tagline"
            render={({ field }) => (
              <Input
                id="tagline"
                label="Frase corta (opcional)"
                maxLength={LIMITS.tagline}
                error={formState.errors.tagline?.message}
                supporting={`${field.value.length} de ${LIMITS.tagline}. Se guarda con tu marca; la pantalla de pedido todavía no la muestra.`}
                {...field}
              />
            )}
          />
        </section>

        <section aria-labelledby="brand-images" className="space-y-5">
          <h2 id="brand-images" className="t-title-medium text-[var(--ink)]">Logo e ícono</h2>
          <ImageField
            kind="logo"
            label="Logo"
            hint="PNG, JPG o WebP, menos de 1 MB. Con fondo transparente se ve mejor. Lo reducimos a 1200 px de ancho."
            value={values.logoUrl ?? ''}
            busy={busyKind === 'logo'}
            error={imageErrors.logo}
            onPick={(f) => pickImage('logo', f)}
          />
          <ImageField
            kind="icon"
            label="Ícono"
            hint="Cuadrado, de al menos 192 px. Si no lo es, lo recortamos al centro. Queda en 512 × 512 px."
            value={values.iconUrl ?? ''}
            busy={busyKind === 'icon'}
            error={imageErrors.icon}
            onPick={(f) => pickImage('icon', f)}
          />
        </section>

        <section aria-labelledby="brand-colors" className="space-y-5">
          <h2 id="brand-colors" className="t-title-medium text-[var(--ink)]">Colores</h2>
          <Controller
            control={control}
            name="primary"
            render={({ field }) => (
              <ColorField
                id="primary"
                label="Color de marca"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.primary?.message}
                supporting="Botones, enlaces y títulos."
              />
            )}
          />
          {primaryNote && <ContrastNote text={primaryNote} />}
          <Controller
            control={control}
            name="accent"
            render={({ field }) => (
              <ColorField
                id="accent"
                label="Color de realce"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={formState.errors.accent?.message}
                supporting="Detalles del Club, sellos y avisos."
              />
            )}
          />
          {accentNote && <ContrastNote text={accentNote} />}
          <p className="t-body-small text-[var(--ink-soft)]">
            El fondo y el texto no cambian: así todo se lee bien con cualquier color que elijas.
          </p>
        </section>

        <section aria-labelledby="brand-font" className="space-y-3">
          <h2 id="brand-font" className="t-title-medium text-[var(--ink)]">Tipografía</h2>
          <Controller
            control={control}
            name="fontPreset"
            render={({ field }) => (
              <FontPicker name="fontPreset" value={field.value} onChange={field.onChange} sample={shown.displayName} />
            )}
          />
        </section>

        <section aria-labelledby="brand-apply" className="space-y-4 border-t border-[var(--line)] pt-6">
          <h2 id="brand-apply" className="t-title-medium text-[var(--ink)]">Dónde se aplica</h2>
          <p className="t-body-medium text-[var(--ink-soft)]">
            La marca es una sola para toda tu organización. Al guardar, se copia a {branches.length === 1 ? 'tu sucursal' : `las ${branches.length} sucursales`}
            {': '}
            {branchNames}.
            {stored.outOfSync > 0 && ` ${stored.outOfSync === 1 ? 'Una sucursal tiene' : `${stored.outOfSync} sucursales tienen`} hoy una marca distinta; quedará igual que las demás.`}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" icon={save.isPending ? 'progress_activity' : 'check'} disabled={!formState.isValid || save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar marca'}
            </Button>
            {!formState.isValid && missing && (
              <p className="t-body-small text-[var(--ink-soft)]">Para guardar, sube {missing}.</p>
            )}
          </div>

          {save.isError && (
            <p role="alert" className="t-body-medium flex items-start gap-2 text-[var(--md-sys-color-error)]">
              <Icon name="error" size={20} className="mt-0.5" />
              <span>{saveErrorMessage(save.error)}</span>
            </p>
          )}
          {savedCount !== null && (
            <p role="status" className="t-body-medium flex items-start gap-2 text-[var(--good-ink)]">
              <Icon name="check_circle" size={20} className="mt-0.5" />
              <span>
                Marca guardada en {savedCount === 1 ? '1 sucursal' : `${savedCount} sucursales`}. Tus clientes la ven al abrir el
                enlace de pedido; puede tardar unos minutos en la app ya instalada.
              </span>
            </p>
          )}
        </section>
      </form>

      <aside aria-label="Vista previa para tus clientes" className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <h2 className="t-title-medium mb-3 text-[var(--ink)]">Vista previa</h2>
        <BrandPreview branding={shown} branchName={selectedBranch?.name ?? branches[0].name} />
      </aside>
    </div>
  );
}

function ContrastNote({ text }: { text: string }) {
  return (
    <p role="status" className="t-body-small flex items-start gap-2 rounded-[10px] bg-[var(--md-sys-color-surface-container-highest)] p-3 text-[var(--ink)]">
      <Icon name="contrast" size={18} className="mt-0.5 shrink-0 text-[var(--ink-soft)]" />
      <span>{text}</span>
    </p>
  );
}
