export const PROTECTED_ADMIN_EMAIL = 'selahattin50@gmail.com';

export const PROTECTED_ADMIN_PROFILE = {
  email: PROTECTED_ADMIN_EMAIL,
  name: 'Selahattin Ölgün',
  phone: '+905323340389',
  role: 'Tam Yetkili'
} as const;

export const isProtectedAdminEmail = (email?: string | null) => email === PROTECTED_ADMIN_EMAIL;
