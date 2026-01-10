import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  FileText,
  Ruler,
  LogOut,
  Settings,
  Image
} from 'lucide-react'
import { useLogout } from '@/hooks/useAuth'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Measurements', href: '/measurements', icon: Ruler },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Gallery', href: '/gallery', icon: Image },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export const Sidebar = () => {
  const location = useLocation()
  const logout = useLogout()

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4 mb-8">
          <h1 className="text-xl font-bold">Stitch Desk</h1>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-shrink-0 flex border-t p-4">
        <button
          onClick={() => logout.mutate()}
          className="group flex items-center w-full px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  )
}

