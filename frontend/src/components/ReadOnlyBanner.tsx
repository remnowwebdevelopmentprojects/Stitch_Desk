import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Crown } from 'lucide-react'
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'

export const ReadOnlyBanner = () => {
  const { isReadOnly, isExpired, isTrial, daysRemaining, subscription } = useSubscriptionAccess()

  // Don't show banner if user has full access
  if (!isReadOnly && !isExpired) return null

  // Trial ending soon warning (7 days or less)
  if (isTrial && daysRemaining <= 7 && daysRemaining > 0) {
    return (
      <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">
          Trial Ending Soon
        </AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          Your trial expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
          {' '}
          <Link to="/settings/subscription" className="underline font-medium">
            Upgrade now to continue using StitchDesk
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  // Read-only mode (expired but within grace period)
  if (isReadOnly) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <span>Read-Only Mode</span>
          <Crown className="h-4 w-4" />
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your subscription has expired. You can view all your data but cannot create or edit anything.
          </span>
          <Link to="/settings/subscription">
            <Button variant="outline" size="sm" className="ml-4">
              Renew Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }

  // Completely expired (beyond grace period)
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Subscription Expired</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Your subscription has expired. Please renew to access your data.
        </span>
        <Link to="/settings/subscription">
          <Button variant="destructive" size="sm" className="ml-4">
            Renew Subscription
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  )
}
