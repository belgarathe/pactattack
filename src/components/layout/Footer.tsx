import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-surface/40 py-12">
      <div className="container">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="mb-4 text-lg font-bold">PactAttack</h3>
            <p className="text-sm text-muted">Open. Collect. Dominate.</p>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Links</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/marketplace" className="hover:text-foreground">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/collection" className="hover:text-foreground">
                  Collection
                </Link>
              </li>
              <li>
                <Link href="/purchase" className="hover:text-foreground">
                  Purchase Coins
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-white/5 pt-8 text-center text-sm text-muted">
          <p>© 2025 PactAttack. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}




