import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { Loader2 } from 'lucide-react'

export const GoogleCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const errorMsg = searchParams.get('error')

    if (errorMsg) {
      setError(errorMsg)
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    if (token) {
      // Store token
      localStorage.setItem('token', token)

      // Fetch user data
      apiClient
        .get('/auth/me/')
        .then((response) => {
          localStorage.setItem('user', JSON.stringify(response.data))
          navigate('/dashboard')
        })
        .catch(() => {
          setError('Failed to fetch user data')
          setTimeout(() => navigate('/login'), 3000)
        })
    } else {
      setError('Invalid authentication response')
      setTimeout(() => navigate('/login'), 3000)
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      {error ? (
        <div className="text-center">
          <p className="text-destructive mb-2">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      ) : (
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Completing sign in...</p>
        </div>
      )}
    </div>
  )
}
