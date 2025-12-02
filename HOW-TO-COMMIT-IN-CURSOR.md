# How to Commit in Cursor - Step by Step

## 🎯 Simple Step-by-Step Guide

### Step 1: Open Source Control Panel

1. **Look at the LEFT SIDEBAR** in Cursor (the bar with icons on the far left)
2. **Find the icon that looks like a branch/tree** (📂 Source Control icon)
   - It's usually the 3rd or 4th icon from the top
   - Or look for an icon with "Source Control" text
3. **Click on it**

**OR** press the keyboard shortcut: `Ctrl+Shift+G`

---

### Step 2: See Your Changes

After clicking, you should see:
- A panel that says **"Source Control"** at the top
- Below that, it might say **"Changes"** 
- You should see a list of files like:
  - `.github/workflows/deploy.yml`
  - `deploy-on-server.sh`
  - `DEPLOYMENT-COMPLETE.md`
  - etc.

---

### Step 3: Stage All Files (Prepare to Commit)

1. **Look for a "+" button** next to the word "Changes"
   - It might be a "+" icon or say "Stage All Changes"
2. **Click the "+" button** to add all files
   - All your files should now move to a section called "Staged Changes"

**OR** you can click the "+" next to each file individually

---

### Step 4: Write Commit Message

1. **Look for a text box** at the top that says:
   - "Message" or 
   - "Type commit message..."
2. **Click in that box**
3. **Type exactly this:**
   ```
   Add deployment configuration
   ```

---

### Step 5: Commit

1. **Look for a checkmark button** (✓) or button that says "Commit"
   - It's usually at the top next to the message box
2. **Click the checkmark/Commit button**

**OR** press `Ctrl+Enter` on your keyboard

You should see a message like "Committed" or the files disappear from Changes

---

### Step 6: Push to GitHub

1. **Look for three dots** (...) or a menu button at the top of Source Control panel
2. **Click the three dots**
3. **A menu will appear**, look for:
   - "Push" 
   - "Push to..."
   - "Sync" or sync icon (circular arrows)

4. **Click "Push"** or "Push to..."

**OR** look for a cloud icon with an arrow pointing up - click that

---

### Step 7: Verify

After pushing, you should see:
- A message like "Pushed to origin/main"
- Or the files should disappear

**Check on GitHub:**
- Go to: https://github.com/belgarathe/pactattack
- You should see your new files there!

---

## 🎥 Visual Guide

```
┌─────────────────────────────────────┐
│ CURSOR LEFT SIDEBAR                 │
│                                     │
│  📁 Explorer                        │
│  🔍 Search                          │
│  📂 Source Control  ← CLICK HERE!   │
│  🐛 Run                             │
│  📦 Extensions                      │
└─────────────────────────────────────┘

         ↓ Click Source Control

┌─────────────────────────────────────┐
│ SOURCE CONTROL PANEL                │
│                                     │
│ 📝 Changes                          │
│   ┌─────────────────────────────┐  │
│   │ 📄 deploy-on-server.sh      │  │
│   │ 📄 DEPLOYMENT-COMPLETE.md   │  │
│   │ 📄 .github/workflows/...    │  │
│   └─────────────────────────────┘  │
│                                     │
│ [ + ] Stage All Changes ← CLICK!    │
│                                     │
│ Message: [Type commit message...]   │
│ [ ✓ ] Commit ← CLICK AFTER TYPING!  │
│                                     │
│ [ ... ] Menu → Push ← CLICK HERE!   │
└─────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Don't see Source Control icon?
- Press `Ctrl+Shift+G` to open it
- Or go to: View → Source Control

### Don't see any files?
- Make sure you saved all files (Ctrl+S)
- The files might already be committed
- Check if they're in "Staged Changes" instead of "Changes"

### "Push" button is grayed out?
- You need to commit first (Step 5)
- Or you're not connected to GitHub - check your GitHub connection

### Get an error about authentication?
- Cursor should use your SSH key automatically
- If not, go to: File → Preferences → Settings
- Search for "Git" and check authentication settings

---

## ✅ Quick Checklist

- [ ] Opened Source Control (`Ctrl+Shift+G`)
- [ ] See files listed under "Changes"
- [ ] Clicked "+" to stage all files
- [ ] Typed commit message: "Add deployment configuration"
- [ ] Clicked checkmark to commit
- [ ] Clicked three dots → "Push"
- [ ] Verified files on GitHub

---

## 🚀 After You Push

Once you've pushed successfully:

1. Go to: https://github.com/belgarathe/pactattack
2. You should see all your new deployment files
3. Then you can deploy to your server!

---

**Try it now and let me know at which step you get stuck!** 😊

