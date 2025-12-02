import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="container py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">About PactAttack</h1>
        <p className="text-muted">Experience the thrill of opening Magic: The Gathering packs</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>What is PactAttack?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted">
              PactAttack is a digital platform that brings the excitement of opening Magic: The Gathering packs to your screen. Collect rare cards, build your collection, and experience the thrill of pack opening from anywhere.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Purchase Coins</h3>
              <p className="text-muted">Buy Coins using our secure payment system.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Choose a Box</h3>
              <p className="text-muted">Browse our collection of Magic: The Gathering boxes.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Open Packs</h3>
              <p className="text-muted">Experience the excitement of opening packs with our immersive animations.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Build Your Collection</h3>
              <p className="text-muted">Track your cards, view their values, and build your ultimate collection.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




