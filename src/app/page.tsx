import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Package, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="container py-12">
      {/* Hero Section */}
      <section className="hero-grid mb-20 rounded-3xl border border-white/10 p-12 text-center">
        <h1 className="mb-6 text-5xl font-bold md:text-7xl">
          Open. Collect.{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dominate.
          </span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-muted">
          Experience the thrill of opening Magic: The Gathering packs. Collect rare cards, build
          your collection, and dominate the marketplace.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/marketplace">Browse Boxes</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="mb-20">
        <h2 className="mb-12 text-center text-4xl font-bold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Package,
              title: 'Choose a Box',
              description: 'Browse our collection of Magic: The Gathering boxes and select your favorite.',
            },
            {
              icon: Sparkles,
              title: 'Open Packs',
              description: 'Experience the excitement of opening packs with our immersive 3D animation.',
            },
            {
              icon: TrendingUp,
              title: 'Build Collection',
              description: 'Collect rare cards, track their value, and build your ultimate collection.',
            },
          ].map((step, index) => (
            <Card key={index}>
              <CardHeader>
                <step.icon className="mb-4 h-12 w-12 text-primary" />
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Boxes */}
      <section className="mb-20">
        <h2 className="mb-12 text-center text-4xl font-bold">Featured Boxes</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20" />
              <CardHeader>
                <CardTitle>Featured Box {i}</CardTitle>
                <CardDescription>Discover amazing cards in this featured box.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/marketplace">View Box</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-primary/10 to-secondary/10 p-12 text-center">
        <h2 className="mb-4 text-4xl font-bold">Ready to Start Collecting?</h2>
        <p className="mb-8 text-muted">Join thousands of collectors opening packs every day.</p>
        <Button asChild size="lg">
          <Link href="/register">Create Account</Link>
        </Button>
      </section>
    </div>
  );
}
