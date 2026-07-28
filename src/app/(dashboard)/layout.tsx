import { createClient } from '@/lib/supabase/server'
import { logout } from '../(auth)/actions'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user?.email} logoutAction={logout} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">{children}</div>
      </main>
    </div>
  )
}
