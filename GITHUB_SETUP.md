# GitHub Repository Setup Guide

## ⚠️ Git Not Installed

Git is not currently installed on your system. Follow these steps to set up GitHub for your project.

## 📥 Step 1: Install Git

### Option A: Download Git for Windows
1. Visit: https://git-scm.com/download/win
2. Download and run the installer
3. Use default settings (recommended)
4. Restart your terminal/PowerShell after installation

### Option B: Install via Package Manager
```powershell
# Using Chocolatey (if installed)
choco install git

# Using Winget (Windows 11)
winget install Git.Git
```

## 🔧 Step 2: Configure Git (After Installation)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 📦 Step 3: Initialize Git Repository

After Git is installed, run these commands:

```bash
cd F:\PA\pactattack

# Initialize Git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: PactAttack - MTG Pack Opening Platform"
```

## 🌐 Step 4: Create GitHub Repository

### Using GitHub Website:

1. **Go to GitHub**: Visit [https://github.com/new](https://github.com/new)

2. **Create New Repository**:
   - Repository name: `pactattack` (or your preferred name)
   - Description: "Magic: The Gathering pack opening platform"
   - Visibility: Choose **Private** (recommended) or Public
   - **DO NOT** check "Initialize with README" (we already have one)
   - **DO NOT** add .gitignore or license

3. **Click "Create repository"**

## 🔗 Step 5: Connect Local Repository to GitHub

After creating the repository on GitHub, copy the repository URL (e.g., `https://github.com/yourusername/pactattack.git`)

Then run:

```bash
cd F:\PA\pactattack

# Add remote repository
git remote add origin https://github.com/yourusername/pactattack.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## 🔐 Important: Environment Variables

**DO NOT commit your `.env` file!** 

The `.gitignore` file already excludes:
- `.env*` files (all environment files)
- `node_modules/`
- `.next/`
- Prisma migrations
- Other sensitive files

## 📝 Optional: Create .env.example

Create a `.env.example` file (without sensitive values) for reference:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pactattack"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## ✅ Files Ready for GitHub

The following files have been prepared:
- ✅ `README.md` - Complete project documentation
- ✅ `.gitignore` - Properly configured to exclude sensitive files
- ✅ `GITHUB_SETUP.md` - This setup guide
- ✅ All source code files

## 🚀 After Pushing to GitHub

### 1. Set up GitHub Secrets (for deployment)
- Go to repository → Settings → Secrets and variables → Actions
- Add environment variables as secrets

### 2. Enable GitHub Actions (optional)
- Set up CI/CD workflows
- Add automated testing and linting

### 3. Add Collaborators (if needed)
- Go to Settings → Collaborators
- Add team members

## 📋 Quick Command Reference

```bash
# Check Git status
git status

# Add files
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# View commit history
git log
```

## 🆘 Troubleshooting

### "git is not recognized"
- Install Git from https://git-scm.com/download/win
- Restart your terminal/PowerShell

### "Permission denied" when pushing
- Check your GitHub credentials
- Use Personal Access Token instead of password
- Generate token: GitHub → Settings → Developer settings → Personal access tokens

### "Repository not found"
- Verify the repository URL is correct
- Check that you have access to the repository

---

**Ready to push!** Once Git is installed, follow Steps 3-5 above.
