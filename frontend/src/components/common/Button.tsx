import type { ReactNode } from 'react'
import { Button as UIButton } from '@/components/ui/button'
import type { ButtonProps as UIButtonProps } from '@/components/ui/button'

export interface ButtonProps extends UIButtonProps {
  children: ReactNode
}

export const Button = ({ children, ...props }: ButtonProps) => {
  return <UIButton {...props}>{children}</UIButton>
}

