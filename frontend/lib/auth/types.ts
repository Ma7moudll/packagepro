export interface User {
  id: string
  email: string
  name?: string
  image?: string
  emailVerified?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile extends User {
  phone?: string
  company?: string
  address?: string
  preferences?: {
    language: "ar" | "en"
    theme: "light" | "dark"
    notifications: boolean
  }
}

export interface SignupData {
  email: string
  password: string
  name?: string
  acceptTerms: boolean
}

export interface LoginData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface ResetPasswordData {
  email: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

