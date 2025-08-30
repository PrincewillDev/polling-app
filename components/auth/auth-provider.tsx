'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // TODO: Replace with actual API call
      // Check for stored token/session
      const token = localStorage.getItem('auth-token')
      if (token) {
        // Validate token with API
        // For now, using mock data
        const mockUser = {
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          avatar: '/placeholder-avatar.jpg'
        }
        setUser(mockUser)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Clear invalid token
      localStorage.removeItem('auth-token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      const response = await mockApiCall('/auth/login', {
        email,
        password
      })

      if (response.success) {
        const { user, token } = response.data
        localStorage.setItem('auth-token', token)
        setUser(user)
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      const response = await mockApiCall('/auth/register', {
        name,
        email,
        password
      })

      if (response.success) {
        const { user, token } = response.data
        localStorage.setItem('auth-token', token)
        setUser(user)
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // TODO: Replace with actual API call to invalidate token
      await mockApiCall('/auth/logout', {})

      localStorage.removeItem('auth-token')
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  // Mock API call function - replace with actual API integration
  const mockApiCall = async (endpoint: string, data: any) => {
    return new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        // Simulate API responses
        switch (endpoint) {
          case '/auth/login':
            if (data.email === 'demo@example.com' && data.password === 'password') {
              resolve({
                success: true,
                data: {
                  user: {
                    id: 'user-1',
                    name: 'Demo User',
                    email: data.email,
                    avatar: '/placeholder-avatar.jpg'
                  },
                  token: 'mock-jwt-token-' + Date.now()
                }
              })
            } else {
              reject(new Error('Invalid credentials'))
            }
            break

          case '/auth/register':
            resolve({
              success: true,
              data: {
                user: {
                  id: 'user-' + Date.now(),
                  name: data.name,
                  email: data.email,
                  avatar: '/placeholder-avatar.jpg'
                },
                token: 'mock-jwt-token-' + Date.now()
              }
            })
            break

          case '/auth/logout':
            resolve({ success: true })
            break

          default:
            reject(new Error('Unknown endpoint'))
        }
      }, 1000) // Simulate network delay
    })
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export types for use in other components
export type { User, AuthContextType }
