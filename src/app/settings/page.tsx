import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Settings</h1>
        <p className="text-muted">Manage your account settings</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted">Email</label>
              <p className="text-lg">{session.user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted">Name</label>
              <p className="text-lg">{session.user.name || 'Not set'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted">Role</label>
              <p className="text-lg">{session.user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




