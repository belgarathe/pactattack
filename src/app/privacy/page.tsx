import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>
              PactAttack respects your privacy and is committed to protecting your personal data.
            </p>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Data We Collect</h3>
              <p>
                We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">How We Use Your Data</h3>
              <p>
                We use your data to provide, maintain, and improve our services, process transactions, and communicate with you.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Data Security</h3>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




