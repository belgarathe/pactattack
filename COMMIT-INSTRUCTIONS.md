# How to Commit and Push - belgarathe/pactattack

## Option 1: Use Cursor's Built-in Git (Recommended)

Since Cursor is connected to your GitHub account:

1. **Open Source Control in Cursor:**
   - Click the Source Control icon in the left sidebar (looks like a branch)
   - Or press `Ctrl+Shift+G`

2. **You should see new files:**
   - `.github/workflows/deploy.yml`
   - `deploy-on-server.sh`
   - `DEPLOYMENT-COMPLETE.md`
   - `DEPLOY-FINAL.md`
   - Other deployment files

3. **Stage All Changes:**
   - Click the "+" next to "Changes" to stage all files
   - Or click the "+" next to each file

4. **Commit:**
   - Type commit message: `Add deployment configuration`
   - Press `Ctrl+Enter` or click the checkmark

5. **Push:**
   - Click the "..." menu (three dots) at top
   - Select "Push" or "Push to..."
   - Or use the sync button

---

## Option 2: Use Git Bash

If you have Git Bash installed:

1. **Open Git Bash**
2. **Navigate to project:**
   ```bash
   cd /f/PA/pactattack
   ```

3. **Run commands:**
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push
   ```

---

## Option 3: Use Windows Command Prompt with Full Git Path

Find where Git is installed (usually):
- `C:\Program Files\Git\bin\git.exe`
- `C:\Program Files (x86)\Git\bin\git.exe`

Then run:
```cmd
cd F:\PA\pactattack
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "Add deployment configuration"
"C:\Program Files\Git\bin\git.exe" push
```

---

## Option 4: Install Git for Windows

If Git is not installed:

1. Download: https://git-scm.com/download/win
2. Install with default settings
3. Restart Cursor
4. Use Option 1 (Cursor's Git interface)

---

## Files to Commit

The following new files should be committed:

- `.github/workflows/deploy.yml` - Automatic deployment workflow
- `deploy-on-server.sh` - Server deployment script
- `DEPLOYMENT-COMPLETE.md` - Complete deployment guide
- `DEPLOY-FINAL.md` - Quick deployment reference
- Other deployment documentation files

---

## Recommended: Use Cursor's Git Interface

Since Cursor is connected to your GitHub, this is the easiest way:

1. Open Source Control (`Ctrl+Shift+G`)
2. Stage all files
3. Commit with message: "Add deployment configuration"
4. Push to GitHub

Then your repository will be ready for deployment!

---

After pushing, your repository will have all deployment files and you can deploy to your server! 🚀

