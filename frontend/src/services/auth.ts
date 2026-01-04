import apiClient from './api'
import type { LoginCredentials, AuthResponse } from '@/types'

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login/', credentials)
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout/')
    localStorage.removeItem('token')
  },

  getCurrentUser: async () => {
    // For now, we'll get user from the login response
    // If backend has a /auth/me/ endpoint, use that instead
    const token = localStorage.getItem('token')
    if (!token) {
      throw new Error('No token found')
    }
    // Return user from localStorage or make API call if endpoint exists
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    throw new Error('User not found')
  },
}

