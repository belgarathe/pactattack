# Database Setup Guide for PactAttack

## Option 1: Install PostgreSQL (Recommended)

### Windows Installation:

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer from EnterpriseDB or use the official installer

2. **Install PostgreSQL:**
   - Run the installer
   - Remember the password you set for the `postgres` user
   - Default port is 5432
   - Default user is `postgres`

3. **Update .env file:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pactattack"
   ```
   Replace `YOUR_PASSWORD` with the password you set during installation.

4. **Create the database:**
   ```bash
   # Using pgAdmin (GUI):
   # 1. Open pgAdmin
   # 2. Right-click "Databases" → Create → Database
   # 3. Name it "pactattack"
   
   # OR using psql command line:
   psql -U postgres
   CREATE DATABASE pactattack;
   \q
   ```

5. **Push the schema:**
   ```bash
   npm run db:push
   ```

6. **Seed the database:**
   ```bash
   npm run db:seed
   ```

## Option 2: Use Docker (Alternative)

If you have Docker installed:

```bash
# Run PostgreSQL in Docker
docker run --name pactattack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pactattack -p 5432:5432 -d postgres

# Update .env file:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pactattack"

# Then push schema:
npm run db:push
npm run db:seed
```

## Option 3: Use Online PostgreSQL (Quick Start)

You can use a free PostgreSQL service like:
- **Supabase**: https://supabase.com (Free tier available)
- **Neon**: https://neon.tech (Free tier available)
- **Railway**: https://railway.app (Free tier available)

1. Sign up and create a new PostgreSQL database
2. Copy the connection string
3. Update your `.env` file with the connection string
4. Run: `npm run db:push` and `npm run db:seed`

## Current .env Configuration

Your current `.env` file has these defaults:
- Database: `postgresql://postgres:postgres@localhost:5432/pactattack`
- This assumes PostgreSQL is running locally with:
  - Username: `postgres`
  - Password: `postgres`
  - Host: `localhost`
  - Port: `5432`
  - Database: `pactattack`

**Update the DATABASE_URL in `.env` to match your PostgreSQL installation!**

## After Database Setup

Once your database is configured:

1. **Push the schema:**
   ```bash
   npm run db:push
   ```

2. **Seed with sample data:**
   ```bash
   npm run db:seed
   ```

3. **Verify setup:**
   ```bash
   npm run db:studio
   ```
   This opens Prisma Studio where you can view your database.

## Troubleshooting

**"Authentication failed" error:**
- Check your PostgreSQL username and password
- Verify PostgreSQL service is running
- Update DATABASE_URL in `.env` with correct credentials

**"Database does not exist" error:**
- Create the database first (see step 4 above)
- Or use `createdb pactattack` command

**"Connection refused" error:**
- Ensure PostgreSQL service is running
- Check if port 5432 is correct
- Verify firewall settings




