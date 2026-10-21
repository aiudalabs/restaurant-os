import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input, Select } from '@/components/ui/input';
import { Card, PageHeader, StatusChip, Switch } from '@/components/ui/m3';
import { useAuth } from '@/hooks/use-auth';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useOrganization } from '@/hooks/use-organization';
import { updateOrganizationFiscal } from '@/services/organization.service';
import { getFiscalStatus, setFiscalCredentials, type FiscalCredentialsStatus } from '@/services/fiscal.service';
import type { OrganizationFiscal } from '@/types/organization';
import { isBranchFiscalComplete } from './branch-fiscal';

const errorMessage = (e: unknown, fallback: string): string => (e instanceof Error && e.message ? e.message : fallback);

function Spinner({ size = 32 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="animate-spin rounded-full border-4 border-[var(--md-sys-color-primary)] border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

function Alert({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  const cls =
    tone === 'error'
      ? 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
      : 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`t-body-medium rounded-lg px-3 py-2 ${cls}`}>
      {children}
    </p>
  );
}

function CardTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]">
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0">
        <h3 className="t-title-large text-[var(--md-sys-color-on-surface)]">{title}</h3>
        {subtitle && <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Fiscal configuration ───

const fiscalSchema = z
  .object({
    enabled: z.boolean(),
    env: z.enum(['test', 'prod']),
    ruc: z.string().trim(),
    dv: z.string().trim(),
    taxIdType: z.enum(['1', '2']),
    legalName: z.string().trim(),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d{3,4}-\d{4}$/.test(v), 'Formato 999-9999 o 9999-9999'),
    defaultCpbsAbr: z.string().trim(),
    defaultCpbsCmp: z.string().trim(),
    defaultTaxCode: z.enum(['00', '01']),
  })
  .superRefine((v, ctx) => {
    // Disabled config may stay half-filled; enabling it needs what every invoice carries.
    if (!v.enabled) return;
    const required: [keyof typeof v, string][] = [
      ['ruc', 'RUC requerido'],
      ['dv', 'DV requerido'],
      ['legalName', 'Razón social requerida'],
      ['defaultCpbsAbr', 'CPBS requerido'],
      ['defaultCpbsCmp', 'CPBS requerido'],
    ];
    for (const [key, message] of required) {
      if (v[key] === '') ctx.addIssue({ code: 'custom', path: [key], message });
    }
  });

type FiscalFormValues = z.infer<typeof fiscalSchema>;

function toFormValues(fiscal: OrganizationFiscal | undefined): FiscalFormValues {
  return {
    enabled: fiscal?.enabled ?? false,
    env: fiscal?.env ?? 'test',
    ruc: fiscal?.ruc ?? '',
    dv: fiscal?.dv ?? '',
    taxIdType: fiscal?.taxIdType ?? '2',
    legalName: fiscal?.legalName ?? '',
    phone: fiscal?.phone ?? '',
    defaultCpbsAbr: fiscal?.defaultCpbsAbr ?? '',
    defaultCpbsCmp: fiscal?.defaultCpbsCmp ?? '',
    defaultTaxCode: fiscal?.defaultTaxCode ?? '01',
  };
}

function FiscalConfigCard({ orgId, initial, canEdit }: { orgId: string; initial: OrganizationFiscal | undefined; canEdit: boolean }) {
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<FiscalFormValues>({
    resolver: zodResolver(fiscalSchema),
    defaultValues: toFormValues(initial),
  });
  const env = useWatch({ control, name: 'env' });

  const onSubmit = async (values: FiscalFormValues) => {
    setSaveError('');
    setSaved(false);
    const { phone, ...rest } = values;
    const fiscal: OrganizationFiscal = { ...rest, provider: 'digifact' };
    if (phone) fiscal.phone = phone;
    try {
      await updateOrganizationFiscal(orgId, fiscal);
      reset(values);
      setSaved(true);
    } catch (e) {
      setSaveError(errorMessage(e, 'No se pudo guardar la configuración.'));
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardTitle
          icon="receipt"
          title="Factura electrónica (Digifact)"
          subtitle="Al cobrar un pedido se emite su factura ante la DGI a través de Digifact."
        />
        <fieldset disabled={!canEdit || isSubmitting} className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="fiscal-enabled" className="cursor-pointer">
              <span className="t-body-large block text-[var(--md-sys-color-on-surface)]">Emitir factura electrónica</span>
              <span className="t-body-medium block text-[var(--md-sys-color-on-surface-variant)]">
                Apagado, los pedidos se cobran sin factura.
              </span>
            </label>
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Switch id="fiscal-enabled" checked={field.value} onChange={field.onChange} disabled={!canEdit || isSubmitting} />
              )}
            />
          </div>

          <Select
            id="fiscal-env"
            label="Ambiente"
            supporting={
              env === 'test'
                ? 'En Pruebas las facturas no tienen validez fiscal y el nombre del emisor se reemplaza por la leyenda de prueba de Digifact.'
                : 'Las facturas se emiten con validez fiscal ante la DGI.'
            }
            {...register('env')}
          >
            <option value="test">Pruebas</option>
            <option value="prod">Producción</option>
          </Select>

          <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
            <Input id="fiscal-ruc" label="RUC" placeholder="155-1234-567890" error={errors.ruc?.message} {...register('ruc')} />
            <Input id="fiscal-dv" label="DV" placeholder="00" error={errors.dv?.message} {...register('dv')} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Select id="fiscal-taxid-type" label="Tipo de contribuyente" {...register('taxIdType')}>
              <option value="1">Natural</option>
              <option value="2">Jurídico</option>
            </Select>
            <Input
              id="fiscal-phone"
              label="Teléfono"
              placeholder="997-8242"
              supporting="Formato 999-9999 o 9999-9999"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <Input id="fiscal-legal-name" label="Razón social" error={errors.legalName?.message} {...register('legalName')} />

          <div className="grid gap-6 sm:grid-cols-2">
            <Input
              id="fiscal-cpbs-abr"
              label="CPBS por defecto (segmento)"
              placeholder="50"
              error={errors.defaultCpbsAbr?.message}
              {...register('defaultCpbsAbr')}
            />
            <Input
              id="fiscal-cpbs-cmp"
              label="CPBS por defecto (familia)"
              placeholder="5019"
              error={errors.defaultCpbsCmp?.message}
              {...register('defaultCpbsCmp')}
            />
          </div>
          <p className="t-body-small -mt-4 px-4 text-[var(--md-sys-color-on-surface-variant)]">
            CPBS = Codificación Panameña de Bienes y Servicios. Pide el catálogo a Digifact. Cada producto puede tener el suyo.
          </p>

          <Select id="fiscal-tax-code" label="Impuesto por defecto" {...register('defaultTaxCode')}>
            <option value="00">Exento</option>
            <option value="01">ITBMS 7 %</option>
          </Select>

          {saveError && <Alert tone="error">{saveError}</Alert>}
          {saved && !isDirty && <Alert tone="success">Configuración guardada.</Alert>}

          {canEdit && (
            <div className="flex justify-end">
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

// ─── Digifact credentials ───

const credentialsSchema = z.object({
  username: z.string().trim().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
type CredentialsValues = z.infer<typeof credentialsSchema>;

function CredentialsCard({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<FiscalCredentialsStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => {
    let alive = true;
    getFiscalStatus()
      .then((s) => alive && setStatus(s))
      .catch((e: unknown) => alive && setStatusError(errorMessage(e, 'No se pudo consultar el estado.')));
    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = async (values: CredentialsValues) => {
    setSaveError('');
    setSaved(false);
    try {
      await setFiscalCredentials(values);
      reset({ username: '', password: '' });
      setSaved(true);
      setStatus({ configured: true, username: values.username });
    } catch (e) {
      setSaveError(errorMessage(e, 'No se pudieron guardar las credenciales.'));
    }
  };

  const statusLine = statusError ? (
    <span className="text-[var(--md-sys-color-error)]">{statusError}</span>
  ) : status === null ? (
    'Consultando…'
  ) : status.configured ? (
    <StatusChip tone="success" icon="check">
      Configuradas · usuario {status.username}
    </StatusChip>
  ) : (
    <StatusChip tone="error" icon="key_off">
      Sin configurar
    </StatusChip>
  );

  return (
    <Card className="p-4 sm:p-6">
      <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
        <CardTitle
          icon="key"
          title="Credenciales de Digifact"
          subtitle="El usuario de API que te dio Digifact. Se guarda en el servidor y la contraseña nunca se vuelve a mostrar."
        />
        <div className="t-body-medium mb-6 text-[var(--md-sys-color-on-surface-variant)]">{statusLine}</div>
        {canEdit && (
          <fieldset disabled={isSubmitting} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Input
                id="digifact-username"
                label="Usuario"
                autoComplete="off"
                error={errors.username?.message}
                {...register('username')}
              />
              <Input
                id="digifact-password"
                label="Contraseña"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
            {saveError && <Alert tone="error">{saveError}</Alert>}
            {saved && <Alert tone="success">Credenciales guardadas.</Alert>}
            <div className="flex justify-end">
              <Button type="submit" icon="key" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar credenciales'}
              </Button>
            </div>
          </fieldset>
        )}
      </form>
    </Card>
  );
}

// ─── Branches fiscal readiness ───

function BranchesFiscalCard() {
  const { branches, loading } = useBranchContext();
  return (
    <Card className="p-4 sm:p-6">
      <CardTitle
        icon="storefront"
        title="Sucursales"
        subtitle="Cada sucursal necesita sus datos de establecimiento para facturar."
      />
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner size={20} />
        </div>
      ) : branches.length === 0 ? (
        <p className="t-body-medium text-[var(--md-sys-color-on-surface-variant)]">Aún no tienes sucursales.</p>
      ) : (
        <ul className="divide-y divide-[var(--md-sys-color-outline-variant)]">
          {branches.map((b) => {
            const complete = isBranchFiscalComplete(b);
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="t-body-large min-w-0 truncate text-[var(--md-sys-color-on-surface)]">{b.name}</span>
                <StatusChip tone={complete ? 'success' : 'error'} icon={complete ? 'check' : 'warning'}>
                  {complete ? 'Datos fiscales completos' : 'Faltan datos fiscales'}
                </StatusChip>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Link
          to="/branches"
          className="m3-state t-label-large inline-flex h-10 items-center gap-2 rounded-full px-3 text-[var(--md-sys-color-primary)]"
        >
          Editar en Sucursales
          <Icon name="arrow_forward" size={18} />
        </Link>
      </div>
    </Card>
  );
}

// ─── Page ───

export default function SettingsPage() {
  const { appUser } = useAuth();
  const orgId = appUser?.orgId ?? '';
  const canEdit = appUser?.role === 'admin';
  const { organization, loading } = useOrganization(orgId);

  return (
    <div className="space-y-4">
      <PageHeader subtitle="Facturación electrónica de tus ventas en Panamá." />

      {!canEdit && (
        <div className="flex items-start gap-3 rounded-xl bg-[var(--md-sys-color-secondary-container)] p-4 text-[var(--md-sys-color-on-secondary-container)]">
          <Icon name="lock" size={20} className="shrink-0" />
          <p className="t-body-medium">Solo el administrador puede cambiar la facturación. Puedes ver la configuración.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        // Keyed by org so the form mounts with the loaded config as its initial values.
        <FiscalConfigCard key={orgId} orgId={orgId} initial={organization?.fiscal} canEdit={canEdit} />
      )}

      <CredentialsCard canEdit={canEdit} />
      <BranchesFiscalCard />
    </div>
  );
}
