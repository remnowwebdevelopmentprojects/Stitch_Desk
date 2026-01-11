import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ReadOnlyBanner } from '../ReadOnlyBanner'

interface LayoutProps {
  children: ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ReadOnlyBanner />
          {children}
        </main>
      </div>
    </div>
  )
}

