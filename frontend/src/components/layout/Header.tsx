import { useCurrentUser } from '@/hooks/useAuth'

export const Header = () => {
  const { data: user } = useCurrentUser()

  return (
    <header className="bg-card border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <h2 className="text-lg font-semibold">Welcome back</h2>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

