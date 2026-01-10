import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { settingsService } from '@/services/settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Shield, Key, Mail } from 'lucide-react'

export const SecuritySettingsTab = () => {
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showOTPDialog, setShowOTPDialog] = useState(false)
  const [otpCode, setOTPCode] = useState('')

  // Get current 2FA status from user data
  const userStr = localStorage.getItem('user')
  if (userStr && !is2FAEnabled) {
    try {
      const user = JSON.parse(userStr)
      if (user.is_2fa_enabled) {
        setIs2FAEnabled(true)
      }
    } catch {
      // ignore
    }
  }

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: () => settingsService.changePassword(
      passwordForm.currentPassword,
      passwordForm.newPassword,
      passwordForm.confirmPassword
    ),
    onSuccess: () => {
      alert('Password changed successfully!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      alert(error.response?.data?.error || 'Failed to change password.')
    },
  })

  // 2FA toggle mutation
  const toggle2FAMutation = useMutation({
    mutationFn: (enable: boolean) => settingsService.toggle2FA(enable),
    onSuccess: (data, enable) => {
      if (enable) {
        setShowOTPDialog(true)
        alert('OTP has been sent to your email. Please verify to enable 2FA.')
      } else {
        setIs2FAEnabled(false)
        setShowOTPDialog(false)
        alert('2FA has been disabled.')
        // Update local storage
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            const user = JSON.parse(userStr)
            user.is_2fa_enabled = false
            localStorage.setItem('user', JSON.stringify(user))
          } catch {
            // ignore
          }
        }
      }
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      alert(error.response?.data?.error || 'Failed to toggle 2FA.')
    },
  })

  // Verify 2FA OTP mutation
  const verify2FAMutation = useMutation({
    mutationFn: (otp: string) => settingsService.verify2FAOTP(otp),
    onSuccess: () => {
      setIs2FAEnabled(true)
      setShowOTPDialog(false)
      setOTPCode('')
      alert('2FA has been enabled successfully!')
      // Update local storage
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          user.is_2fa_enabled = true
          localStorage.setItem('user', JSON.stringify(user))
        } catch {
          // ignore
        }
      }
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      alert(error.response?.data?.error || 'Invalid OTP. Please try again.')
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match.')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Password must be at least 6 characters long.')
      return
    }
    changePasswordMutation.mutate()
  }

  const handleEnable2FA = () => {
    toggle2FAMutation.mutate(true)
  }

  const handleDisable2FA = () => {
    if (confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      toggle2FAMutation.mutate(false)
    }
  }

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      alert('Please enter a valid 6-digit OTP.')
      return
    }
    verify2FAMutation.mutate(otpCode)
  }

  return (
    <div className="space-y-6">
      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password for better security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication (2FA)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security by requiring OTP verification via email during login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Email OTP Verification</p>
                <p className="text-sm text-muted-foreground">
                  {is2FAEnabled 
                    ? 'A verification code will be sent to your email during login.'
                    : 'Enable to receive a verification code via email when logging in.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={is2FAEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnable2FA()
                  } else {
                    handleDisable2FA()
                  }
                }}
                disabled={toggle2FAMutation.isPending}
              />
              <span className="text-sm font-medium">
                {is2FAEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OTP Verification Dialog */}
      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
            <DialogDescription>
              We've sent a 6-digit verification code to your email. Please enter it below to enable 2FA.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => setOTPCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
              <p className="text-sm text-muted-foreground">
                Check your email for the verification code.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={verify2FAMutation.isPending} className="flex-1">
                {verify2FAMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  setShowOTPDialog(false)
                  setOTPCode('')
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
