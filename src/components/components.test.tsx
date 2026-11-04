import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Alert } from './Alert'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { ComingSoon } from './ComingSoon'
import { ErrorState } from './ErrorState'
import { FullScreenLoader } from './FullScreenLoader'
import { PasswordField } from './PasswordField'
import { iniciales } from './styles'
import { TextField } from './TextField'
import { UserName } from './UserName'

describe('Button', () => {
  it('mide al menos 44 px (min-h-11 / min-w-11)', () => {
    render(<Button>Ingresar</Button>)
    const boton = screen.getByRole('button', { name: 'Ingresar' })
    expect(boton.className).toContain('min-h-11')
    expect(boton.className).toContain('min-w-11')
    expect(boton.getAttribute('type')).toBe('button')
  })

  it('cargando: deshabilitado y con aria-busy', () => {
    render(<Button cargando>Ingresar</Button>)
    const boton = screen.getByRole('button', { name: 'Ingresar' })
    expect(boton).toHaveProperty('disabled', true)
    expect(boton.getAttribute('aria-busy')).toBe('true')
  })
})

describe('TextField', () => {
  it('asocia label, error y aria-invalid', () => {
    render(<TextField label="Correo" error="Escribí tu correo." />)
    const input = screen.getByLabelText('Correo')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const descrito = input.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(descrito)?.textContent).toBe(
      'Escribí tu correo.',
    )
  })

  it('sin error no marca aria-invalid', () => {
    render(<TextField label="Correo" />)
    const input = screen.getByLabelText('Correo')
    expect(input.hasAttribute('aria-invalid')).toBe(false)
    expect(input.hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('PasswordField', () => {
  it('permite mostrar la contraseña con un botón accesible', async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Contraseña" />)
    const input = screen.getByLabelText('Contraseña')
    expect(input.getAttribute('type')).toBe('password')
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' })
    await user.click(toggle)
    expect(input.getAttribute('type')).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
  })
})

describe('Checkbox', () => {
  it('muestra el error junto a la casilla', () => {
    render(<Checkbox label="Acepto" error="Tenés que aceptar." />)
    const casilla = screen.getByRole('checkbox', { name: 'Acepto' })
    expect(casilla.getAttribute('aria-invalid')).toBe('true')
    const id = casilla.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(id)?.textContent).toBe('Tenés que aceptar.')
  })
})

describe('Alert', () => {
  it('los errores usan role="alert" y el resto role="status"', () => {
    const { rerender } = render(<Alert>Falló</Alert>)
    expect(screen.getByRole('alert').textContent).toContain('Falló')
    rerender(<Alert tono="exito">Listo</Alert>)
    expect(screen.getByRole('status').textContent).toContain('Listo')
  })
})

describe('ErrorState', () => {
  it('ofrece reintentar', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <ErrorState
        titulo="Ups"
        mensaje="No pudimos cargar."
        onRetry={onRetry}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('ComingSoon y FullScreenLoader', () => {
  it('ComingSoon muestra título y "Próximamente"', () => {
    render(<ComingSoon titulo="Chat" descripcion="Pronto vas a poder." />)
    expect(screen.getByRole('heading', { level: 1, name: 'Chat' })).toBeTruthy()
    expect(screen.getByText('Próximamente')).toBeTruthy()
  })

  it('FullScreenLoader se anuncia como estado', () => {
    render(<FullScreenLoader />)
    expect(screen.getByRole('status').textContent).toContain('Cargando')
  })
})

describe('Avatar', () => {
  it('usa la foto con referrerPolicy="no-referrer", lazy y tamaño fijo', () => {
    render(<Avatar src="https://lh3.googleusercontent.com/a" nombre="Ana" />)
    const img = screen.getByRole('img', { name: 'Foto de perfil de Ana' })
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('width')).toBe('48')
  })

  it('cae a iniciales si no hay foto o si falla', () => {
    const { container, rerender } = render(
      <Avatar src="https://lh3.googleusercontent.com/a" nombre="Ana Mora" />,
    )
    fireEvent.error(screen.getByRole('img'))
    expect(container.textContent).toBe('AM')
    rerender(<Avatar src={null} nombre="beto" />)
    expect(container.textContent).toBe('B')
  })

  it('iniciales tolera vacíos y emojis', () => {
    expect(iniciales(null)).toBe('?')
    expect(iniciales('  ')).toBe('?')
    expect(iniciales('😀 Sol')).toBe('😀S')
  })
})

describe('UserName (Nota T14)', () => {
  it('muestra el nombre como texto en una sola línea recortada', () => {
    const zalgo = 'Ana' + String.fromCodePoint(0x301).repeat(50)
    render(<UserName nombre={`<b>${zalgo}</b>`} as="h1" />)
    const titulo = screen.getByRole('heading', { level: 1 })
    expect(titulo.className).toContain('truncate')
    expect(titulo.className).toContain('overflow-hidden')
    expect(titulo.querySelector('b')).toBeNull()
    expect(titulo.textContent).toContain('<b>')
  })

  it('usa un respaldo si no hay nombre', () => {
    render(<UserName nombre={null} />)
    expect(screen.getByText('Sin nombre')).toBeTruthy()
  })
})
