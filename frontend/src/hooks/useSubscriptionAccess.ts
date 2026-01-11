import { useCurrentUser } from './useAuth'

export interface SubscriptionAccess {
  isReadOnly: boolean
  hasWriteAccess: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  subscription: any
  isExpired: boolean
  isTrial: boolean
  daysRemaining: number
}

/**
 * Hook to check subscription access levels
 * Use this to disable UI elements for expired subscriptions
 */
export const useSubscriptionAccess = (): SubscriptionAccess => {
  const { data: user } = useCurrentUser()
  const subscription = user?.subscription

  const isReadOnly = subscription?.is_read_only || false
  const hasWriteAccess = subscription?.has_write_access || false
  const isExpired = subscription?.status === 'expired' || subscription?.status === 'payment_failed'
  const isTrial = subscription?.status === 'trial'

  return {
    // Main access flags
    isReadOnly,
    hasWriteAccess,

    // Convenience flags (all same as hasWriteAccess)
    canCreate: hasWriteAccess,
    canEdit: hasWriteAccess,
    canDelete: hasWriteAccess,

    // Status info
    subscription,
    isExpired,
    isTrial,
    daysRemaining: subscription?.days_remaining || 0,
  }
}
