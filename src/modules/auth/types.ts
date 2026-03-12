export interface AuthUser {
  userId: string
  username: string
  role: 'ADMIN' | 'CAPTAIN'
  teamId: string | null
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SessionPayload {
  userId: string
  role: 'ADMIN' | 'CAPTAIN'
  teamId: string | null
}
