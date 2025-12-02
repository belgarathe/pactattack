import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>
              By accessing and using PactAttack, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Use License</h3>
              <p>
                Permission is granted to temporarily use PactAttack for personal, non-commercial transitory viewing only.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Virtual Currency</h3>
              <p>
                Coins are virtual currency with no real-world value. All purchases are final and non-refundable.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Account Responsibility</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account and password.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




