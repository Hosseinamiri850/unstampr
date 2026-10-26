import { setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';

type Props = { params: Promise<{ locale: string }> };

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthShell mode="register" />;
}
