# PactAttack 🎴

A production-ready Magic: The Gathering pack opening platform with admin dashboard, user system, Stripe payment integration, and animated pack opening experience.

## 🚀 Features

### User Features
- **Pack Opening**: Animated card reveal with rarity-based visual effects
- **Collection Management**: View, filter, and manage your card collection
- **Shopping Cart**: Add cards to cart for physical shipping
- **Checkout System**: Secure Stripe checkout with 5 EUR shipping
- **Sales History**: Track cards sold back to the shop
- **Coin System**: Purchase coins and sell cards for coins
- **Cardmarket Integration**: Real-time card prices from Cardmarket (EUR)

### Admin Features
- **Box Management**: Create and manage card boxes with pull rates
- **Card Management**: Add cards with custom pull rates and coin values
- **Sealed Product Catalog**: Attach curated booster displays/packs to boxes
- **Price Management**: Update card prices from Cardmarket
- **Order Management**: Track and manage physical card orders
- **Admin Dashboard**: View statistics and system health

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui, Framer Motion
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (JWT)
- **Payments**: Stripe SDK
- **External APIs**: 
  - Scryfall API (card data)
  - Gatherer (card images)
  - Cardmarket (card prices and sealed references)
  - TCGplayer (sealed product imagery references)

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL installed and running
- Stripe account (for payments)

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd pactattack
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database:

```bash
createdb pactattack
```

Or use your preferred method to create the database.

### 4. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-random-string-here"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Pokemon Price Tracker (override if needed)
POKEMON_TCG_API_KEY="1b06746a-3380-4d80-9a1a-3efa136a4acd"

```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Database Migration

```bash
# Push schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# (Optional) Seed database (creates sample users, demo box, and sealed catalog entries)
npx prisma db seed
```

### 6. Create Admin User

Open Prisma Studio:
```bash
npx prisma studio
```

Navigate to `http://localhost:5555` and create a user with:
- Email: `admin@pactattack.com` (or your choice)
- Password: Hash with bcrypt (use a password hasher)
- Role: `ADMIN`

Or use the seed script if configured.

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
pactattack/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── (dashboard)/   # User dashboard pages
│   │   ├── (admin)/       # Admin dashboard pages
│   │   ├── api/           # API routes
│   │   └── page.tsx       # Landing page
│   ├── components/         # React components
│   │   ├── ui/            # Shadcn/ui components
│   │   ├── layout/        # Layout components
│   │   ├── pack-opening/  # Pack opening animations
│   │   └── admin/         # Admin components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   └── types/             # TypeScript types
└── public/                # Static assets
```

## 🎮 Usage

### For Users

1. **Register/Login**: Create an account or login
2. **Purchase Coins**: Buy coins to open packs
3. **Open Packs**: Browse marketplace and open packs
4. **Manage Collection**: View, filter, and sell cards
5. **Order Physical Cards**: Add cards to cart and checkout

### For Admins

1. **Access Admin Dashboard**: Navigate to `/admin`
2. **Create Boxes**: Add new card boxes with pull rates
3. **Manage Cards**: Add cards to boxes with custom rates
4. **Set Prices**: Update card prices from Cardmarket
5. **View Orders**: Track physical card orders

### Sealed Product Catalog

- Run `npm run sync:sealed` to scrape **Cardmarket** booster boxes and booster packs (images + set metadata) into `SealedProductCatalog`.
  - The command launches Playwright/Chromium. The first run may download ~200 MB of browser binaries (`npx playwright install chromium` is already part of the setup).
  - To bypass Cloudflare challenges locally, keep the default headful mode (`CARDMARKET_HEADLESS=false`). Set `CARDMARKET_HEADLESS=true` if you have your own clearance cookies or are running in an environment where headless is accepted.
  - Optionally override the user-agent via `CARDMARKET_USER_AGENT`.
- The scraper automatically dedupes products, infers `SealedProductType`, tries to resolve set codes via Scryfall, and stores Cardmarket product IDs + prices so the admin UI can search every MTG sealed product.
- You can still keep small hand-curated fallbacks in `prisma/data/sealedProducts.ts` for demo data, but the sync script is the canonical way to keep the catalog current.

## 🔐 Security

- Server-side pack opening randomization
- Admin authorization middleware
- Rate limiting on API routes
- Secure password hashing with bcrypt
- Stripe webhook signature verification

## 📝 API Endpoints

### User APIs
- `POST /api/packs/open` - Open a pack
- `POST /api/cards/sell` - Sell a card
- `POST /api/cards/sell-bulk` - Sell multiple cards
- `GET /api/cart` - Get cart items
- `POST /api/cart/add` - Add to cart
- `POST /api/cart/remove` - Remove from cart
- `POST /api/checkout/create` - Create checkout session

### Admin APIs
- `GET /api/admin/boxes` - List all boxes
- `POST /api/admin/boxes` - Create box
- `PATCH /api/admin/boxes/[id]` - Update box
- `DELETE /api/admin/boxes/[id]` - Delete box
- `POST /api/admin/boxes/[id]/cards` - Add/update cards

## 🧪 Testing Stripe Payments

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

## 🐛 Troubleshooting

### Prisma Errors
If you see "table does not exist" errors:
```bash
npx prisma db push
npx prisma generate
```

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists

### Stripe Webhook Issues
- Use Stripe CLI for local testing:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## 📄 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## 📞 Support

For issues or questions, please open an issue in the repository.

---

Built with ❤️ using Next.js, Prisma, and Stripe
