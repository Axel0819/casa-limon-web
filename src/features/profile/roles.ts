import type { Rol } from './types'

export interface RolOpcion {
  valor: Rol
  titulo: string
  descripcion: string
}

/** Textos de RF-11 para elegir rol (onboarding y Perfil). */
export const ROL_OPCIONES: readonly RolOpcion[] = [
  {
    valor: 'buscador',
    titulo: 'Busco dónde vivir',
    descripcion:
      'Publicás lo que necesitás y los propietarios te responden con ofertas.',
  },
  {
    valor: 'propietario',
    titulo: 'Tengo una propiedad para alquilar',
    descripcion:
      'Ves lo que buscan las personas en Limón y respondés con tu propiedad.',
  },
  {
    valor: 'ambos',
    titulo: 'Ambas',
    descripcion: 'Buscás alquiler y también tenés una propiedad para ofrecer.',
  },
]

export function rolTitulo(rol: string | null | undefined): string {
  return ROL_OPCIONES.find((o) => o.valor === rol)?.titulo ?? 'Sin definir'
}
