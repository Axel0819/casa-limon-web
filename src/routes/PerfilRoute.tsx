import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/Alert'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/Button'
import { ErrorState } from '@/components/ErrorState'
import { LogoutIcon } from '@/components/icons'
import { TextField } from '@/components/TextField'
import { UserName } from '@/components/UserName'
import { mapAuthError } from '@/features/auth/errors'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { normalizarNombre, validateNombre } from '@/features/auth/validation'
import { RolSelector } from '@/features/profile/components/RolSelector'
import { mapProfileError } from '@/features/profile/errors'
import { useUpdateProfile } from '@/features/profile/mutations'
import { useProfile } from '@/features/profile/queries'
import { rolTitulo } from '@/features/profile/roles'
import {
  isRol,
  type Profile,
  type Rol,
  type UpdateProfileInput,
} from '@/features/profile/types'
import { useSessionStore } from '@/stores/session'

const fechaLarga = new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' })

/** `/perfil` (RF-13): datos, edición de nombre y rol, y cierre de sesión. */
export function PerfilRoute() {
  const { data: perfil, isPending, refetch, isRefetching } = useProfile()

  // Con datos en caché se muestran aunque falle una relectura en segundo plano.
  if (perfil) return <PerfilVista perfil={perfil} />

  if (isPending) {
    return (
      <div
        className="mx-auto flex max-w-2xl flex-col gap-4 p-6"
        aria-busy="true"
      >
        <span className="sr-only" role="status">
          Cargando tu perfil…
        </span>
        <div className="h-20 animate-pulse rounded-2xl bg-limon-celeste-claro" />
        <div className="h-64 animate-pulse rounded-2xl bg-limon-celeste-claro" />
      </div>
    )
  }

  return (
    <ErrorState
      titulo="No pudimos cargar tu perfil"
      mensaje="Revisá tu conexión e intentá de nuevo."
      onRetry={() => void refetch()}
      reintentando={isRefetching}
    />
  )
}

function PerfilVista({ perfil }: { perfil: Profile }) {
  const email = useSessionStore((s) => s.session?.user.email ?? '')
  const actualizar = useUpdateProfile()
  const { cerrar, signOut } = useCerrarSesion()

  const [nombre, setNombre] = useState(perfil.nombre ?? '')
  const [rol, setRol] = useState<Rol | null>(
    isRol(perfil.rol) ? perfil.rol : null,
  )
  const [errorNombre, setErrorNombre] = useState<string | null>(null)

  const cambios: UpdateProfileInput = {}
  if (normalizarNombre(nombre) !== (perfil.nombre ?? ''))
    cambios.nombre = nombre
  if (rol && rol !== perfil.rol) cambios.rol = rol
  const hayCambios = Object.keys(cambios).length > 0

  const guardar = (input: UpdateProfileInput) => {
    actualizar.mutate(input, {
      onSuccess: (nuevo) => setNombre(nuevo.nombre ?? ''),
    })
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const error = cambios.nombre !== undefined ? validateNombre(nombre) : null
    setErrorNombre(error)
    if (error || !hayCambios) return
    guardar(cambios)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-10">
      <section
        aria-labelledby="perfil-titulo"
        className="flex items-center gap-4 rounded-2xl bg-limon-celeste-claro p-4"
      >
        <Avatar src={perfil.avatar} nombre={perfil.nombre} tamano={72} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 id="perfil-titulo" className="min-w-0 text-2xl font-bold">
            <UserName nombre={perfil.nombre} />
          </h1>
          <p className="truncate text-texto-suave">{email}</p>
        </div>
      </section>

      <dl className="grid gap-3 rounded-2xl border-2 border-borde/40 p-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-texto-suave">Rol</dt>
          <dd className="font-semibold">{rolTitulo(perfil.rol)}</dd>
        </div>
        <div>
          <dt className="text-sm text-texto-suave">Miembro desde</dt>
          <dd className="font-semibold">
            {fechaLarga.format(new Date(perfil.created_at))}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="editar-titulo" className="flex flex-col gap-4">
        <h2 id="editar-titulo" className="text-xl font-bold">
          Editar perfil
        </h2>

        {actualizar.isSuccess && !hayCambios ? (
          <Alert tono="exito">Guardamos tus cambios.</Alert>
        ) : null}
        {actualizar.isError ? (
          <Alert
            acciones={
              <Button
                variante="secundario"
                cargando={actualizar.isPending}
                onClick={() => {
                  if (actualizar.variables) guardar(actualizar.variables)
                }}
              >
                Reintentar
              </Button>
            }
          >
            {mapProfileError(actualizar.error)}
          </Alert>
        ) : null}

        <form noValidate onSubmit={enviar} className="flex flex-col gap-5">
          <TextField
            label="Nombre"
            name="nombre"
            autoComplete="nickname"
            ayuda="Entre 2 y 60 caracteres."
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setErrorNombre(null)
            }}
            error={errorNombre}
          />
          <RolSelector
            leyenda="¿Cómo usás CasaLimón?"
            valor={rol}
            onChange={setRol}
          />
          <Button
            type="submit"
            cargando={actualizar.isPending}
            disabled={!hayCambios}
            className="self-start"
          >
            Guardar cambios
          </Button>
        </form>
      </section>

      <section aria-labelledby="sesion-titulo" className="flex flex-col gap-3">
        <h2 id="sesion-titulo" className="text-xl font-bold">
          Sesión
        </h2>
        {signOut.isError ? <Alert>{mapAuthError(signOut.error)}</Alert> : null}
        <Button
          variante="secundario"
          icono={<LogoutIcon className="size-5" />}
          onClick={() => void cerrar()}
          cargando={signOut.isPending}
          className="self-start"
        >
          Cerrar sesión
        </Button>
      </section>
    </div>
  )
}
