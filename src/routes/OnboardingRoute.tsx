import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { TextField } from '@/components/TextField'
import { UserName } from '@/components/UserName'
import { AceptoTerminosLabel } from '@/features/auth/components/AceptoTerminosLabel'
import { validateNombre } from '@/features/auth/validation'
import { RolSelector } from '@/features/profile/components/RolSelector'
import { mapProfileError } from '@/features/profile/errors'
import { useCompleteOnboarding } from '@/features/profile/mutations'
import { useProfile } from '@/features/profile/queries'
import type { Profile, Rol } from '@/features/profile/types'
import { AuthShell } from './auth/AuthLayout'

/** `/bienvenida` (RF-11, RF-12). El loader garantiza que el perfil está en caché. */
export function OnboardingRoute() {
  const { data: perfil } = useProfile()
  if (!perfil) return <FullScreenLoader />
  return <OnboardingForm perfil={perfil} />
}

function OnboardingForm({ perfil }: { perfil: Profile }) {
  const navigate = useNavigate()
  const completar = useCompleteOnboarding()
  // Lo que pide el formulario se fija al montar: no cambia al guardar.
  const [pideNombre] = useState(() => !perfil.nombre)
  const [pideTerminos] = useState(() => !perfil.terminos_aceptados_at)
  const [rol, setRol] = useState<Rol | null>(null)
  const [nombre, setNombre] = useState('')
  const [nombreTocado, setNombreTocado] = useState(false)
  const [acepta, setAcepta] = useState(false)

  const errorNombre = pideNombre ? validateNombre(nombre) : null
  const faltantes = [
    rol ? null : 'elegí una opción',
    errorNombre ? 'escribí tu nombre' : null,
    pideTerminos && !acepta
      ? 'aceptá los Términos y el Aviso de Privacidad'
      : null,
  ].filter((f): f is string => f !== null)
  const completo = faltantes.length === 0

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!rol || !completo) return
    completar.mutate(
      {
        rol,
        nombre: pideNombre ? nombre : undefined,
        aceptaTerminos: acepta,
      },
      { onSuccess: () => void navigate('/', { replace: true }) },
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            Te damos la bienvenida a CasaLimón
          </h1>
          {perfil.nombre ? (
            <p className="flex min-w-0 gap-1 text-texto-suave">
              <span className="shrink-0">Hola,</span>
              <UserName nombre={perfil.nombre} className="font-semibold" />
            </p>
          ) : null}
          <p className="text-texto-suave">
            Contanos cómo vas a usar la app. Podés cambiarlo después en tu
            perfil.
          </p>
        </div>

        {completar.isError ? (
          <Alert>
            {mapProfileError(completar.error)} Tus respuestas siguen acá: podés
            intentar de nuevo.
          </Alert>
        ) : null}

        <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
          <RolSelector
            leyenda="¿Qué te trae a CasaLimón?"
            valor={rol}
            onChange={setRol}
          />

          {pideNombre ? (
            <TextField
              label="Tu nombre"
              name="nombre"
              autoComplete="nickname"
              ayuda="El nombre con el que te van a ver (entre 2 y 60 caracteres)."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => setNombreTocado(true)}
              error={nombreTocado ? errorNombre : null}
            />
          ) : null}

          {pideTerminos ? (
            <Checkbox
              name="aceptaTerminos"
              label={<AceptoTerminosLabel />}
              checked={acepta}
              onChange={(e) => setAcepta(e.target.checked)}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              anchoCompleto
              disabled={!completo}
              cargando={completar.isPending}
              aria-describedby={completo ? undefined : 'onboarding-faltan'}
            >
              Continuar
            </Button>
            {completo ? null : (
              <p id="onboarding-faltan" className="text-sm text-texto-suave">
                Para continuar, {faltantes.join(', ')}.
              </p>
            )}
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
