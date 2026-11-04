import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

function Contador() {
  const [clics, setClics] = useState(0)
  return (
    <button type="button" onClick={() => setClics((n) => n + 1)}>
      Clics: {clics}
    </button>
  )
}

describe('entorno de pruebas', () => {
  it('renderiza un componente y responde a la interacción del usuario', async () => {
    const user = userEvent.setup()
    render(<Contador />)

    const boton = screen.getByRole('button', { name: 'Clics: 0' })
    await user.click(boton)

    expect(boton.textContent).toBe('Clics: 1')
    expect(import.meta.env.VITE_SUPABASE_URL).toBe('http://localhost:54321')
  })
})
