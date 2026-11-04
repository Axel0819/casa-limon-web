import type { SVGProps } from 'react'

/** Íconos SVG inline (decorativos: `aria-hidden` por defecto). Usan `currentColor`. */
type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Base>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Base>
  )
}

export function ChatIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 5h16v11H9l-5 4z" />
    </Base>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Base>
  )
}

export function LogoutIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </Base>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Base>
  )
}

export function AlertIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" />
    </Base>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </Base>
  )
}

/** "G" monocroma (se evita el logo multicolor para respetar los tokens). */
export function GoogleIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 12.2c0 4.6-3.2 7.8-8 7.8a8 8 0 1 1 5.4-13.9" />
      <path d="M20 12h-8" />
    </Base>
  )
}

export function SpinnerIcon({ className = '', ...props }: IconProps) {
  return (
    <Base className={`animate-spin ${className}`} {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Base>
  )
}
