export interface AuthUser {
  id: string;
  companyId: string;
  role: 'owner' | 'admin' | 'hiring_manager' | 'viewer';
}
