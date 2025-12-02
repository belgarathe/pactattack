# Install Git for Windows - Quick Guide

## Why You Need This
Cursor's Source Control feature requires Git to be installed. This is normal and expected!

## Quick Install Steps

### Step 1: Download Git
1. Go to: https://git-scm.com/download/win
2. Click the download button (it should auto-detect Windows)
3. The file will download (about 50MB)

### Step 2: Install Git
1. **Find the downloaded file** (usually in your Downloads folder)
   - It's named something like: `Git-2.43.0-64-bit.exe`
   
2. **Double-click it** to run the installer

3. **Follow the installation wizard:**
   - Click "Next" on the welcome screen
   - Click "Next" on the license screen
   - **Choose install location** - Leave as default, click "Next"
   - **Select components** - Leave everything checked, click "Next"
   - **Choose default editor** - Leave as "Nano editor" or choose "Visual Studio Code", click "Next"
   - **Adjust PATH** - Choose "Git from the command line and also from 3rd-party software", click "Next"
   - **SSH executable** - Leave as "Use bundled OpenSSH", click "Next"
   - **HTTPS** - Leave as "Use the OpenSSL library", click "Next"
   - **Line ending** - Choose "Checkout Windows-style, commit Unix-style", click "Next"
   - **Terminal** - Leave as "Use MinTTY", click "Next"
   - **Default behavior** - Leave defaults, click "Next"
   - **Click "Install"**
   - Wait for installation (takes 1-2 minutes)
   - **Click "Finish"**

### Step 3: Restart Cursor
1. **Close Cursor completely** (exit fully, not just minimize)
2. **Reopen Cursor**
3. Open your project: `F:\PA\pactattack`

### Step 4: Try Source Control Again
1. Press `Ctrl + Shift + G`
2. Or click the Source Control icon in the left sidebar
3. It should work now! ✅

---

## After Installation

Once Git is installed:

1. **Open Cursor**
2. **Press `Ctrl + Shift + G`** (or click Source Control icon)
3. **You should see your files!**

Then follow the commit steps we discussed before.

---

## Alternative: Use GitHub Desktop (Easier GUI)

If you prefer a visual interface:

1. **Download GitHub Desktop:**
   - https://desktop.github.com/

2. **Install and login** with your GitHub account (belgarathe)

3. **Add your repository:**
   - Click "File" → "Add local repository"
   - Browse to: `F:\PA\pactattack`
   - Click "Add repository"

4. **Commit and push:**
   - You'll see all your changes
   - Write commit message: "Add deployment configuration"
   - Click "Commit to main"
   - Click "Push origin"

---

## Which Should You Choose?

### Install Git for Windows (Recommended)
- ✅ Works with Cursor's Source Control
- ✅ Professional standard
- ✅ Command line access
- ✅ Better integration

### GitHub Desktop
- ✅ Easier visual interface
- ✅ Good for beginners
- ❌ Cursor Source Control still needs Git installed

**Recommendation:** Install Git for Windows - it only takes 5 minutes and makes everything work!

---

## Troubleshooting

### After installing, Cursor still doesn't see Git?
1. **Close Cursor completely**
2. **Restart your computer** (sometimes needed)
3. **Reopen Cursor**

### Don't want to download/install?
You can still commit via GitHub website:
1. Go to: https://github.com/belgarathe/pactattack
2. Use GitHub's web interface to upload files manually
3. Not recommended for regular use, but works in a pinch

---

## Next Steps After Installing Git

Once Git is installed and Cursor recognizes it:

1. Open Source Control (`Ctrl + Shift + G`)
2. Stage all files (+ button)
3. Commit: "Add deployment configuration"
4. Push to GitHub

Then you're done! 🎉

---

**Go ahead and install Git for Windows - it's quick and easy!** 

After installation, come back and we'll continue with the commit process! 😊

