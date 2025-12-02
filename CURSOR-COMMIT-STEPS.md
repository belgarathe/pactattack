# 🎯 Commit in Cursor - Exact Steps

## Follow These Steps Exactly:

---

## STEP 1: Press Keyboard Shortcut

**Press these keys together on your keyboard:**
```
Ctrl + Shift + G
```
(That's Control, Shift, and G all at once)

**OR:**

Look at the LEFT side of Cursor window. You'll see a column of icons. Find the icon that looks like a **branch** or **tree** (📂). Click it.

---

## STEP 2: Look at the Panel That Opens

After Step 1, you should see a panel on the LEFT side that says:

```
📂 SOURCE CONTROL
```

Below that, you might see:

```
📝 Changes
```

And below that, a list of files like:
- `.github/workflows/deploy.yml`
- `deploy-on-server.sh`
- `DEPLOYMENT-COMPLETE.md`
- etc.

**If you see files listed, you're in the right place! ✅**

---

## STEP 3: Add Files (Stage Them)

1. Look at the top of the Source Control panel
2. Find a button with a **"+"** (plus sign) icon
3. Next to it might say "Stage All Changes"
4. **CLICK THE "+" BUTTON**

All your files should now move to a section called "Staged Changes"

**If you don't see a "+", try:**
- Right-click on the "Changes" heading
- Look for "Stage All Changes" in the menu

---

## STEP 4: Type Commit Message

1. Look at the TOP of the Source Control panel
2. Find a text box that says something like:
   - "Message"
   - "Type commit message..."
   - Or just an empty box
3. **CLICK IN THAT BOX**
4. **TYPE EXACTLY THIS:**
   ```
   Add deployment configuration
   ```

---

## STEP 5: Commit

1. Look right next to the message box
2. Find a button with a **checkmark** (✓) icon
3. **CLICK THE CHECKMARK**

**OR** just press:
```
Ctrl + Enter
```
(Control and Enter together)

You should see the files disappear or a message saying "Committed"

---

## STEP 6: Push to GitHub

1. Look at the top of the Source Control panel again
2. Find three dots **"..."** or a menu button
3. **CLICK THE THREE DOTS**
4. A menu will appear
5. Look for **"Push"** or **"Push to..."**
6. **CLICK "Push"**

**ALTERNATIVE:**
- Look for a cloud icon (☁️) or upload icon
- Click it

**OR:**
- Right-click on the "Source Control" heading
- Look for "Push" in the menu

---

## STEP 7: Verify It Worked

1. Open your web browser
2. Go to: https://github.com/belgarathe/pactattack
3. You should see all your new files there!

---

## 🆘 TROUBLESHOOTING

### "I don't see Source Control"
- Press `Ctrl+Shift+G` again
- Or go to: **View** → **Source Control** (in the menu bar)

### "I see Source Control but no files"
- Make sure all files are saved (press `Ctrl+S`)
- The files might already be committed - check "Staged Changes"
- Try refreshing: close and reopen Source Control

### "I can't click the + button"
- Try clicking each file's "+" individually
- Or right-click on "Changes" → "Stage All Changes"

### "I typed a message but commit is grayed out"
- Make sure you clicked the "+" to stage files first
- Make sure you typed something in the message box

### "Push button doesn't work"
- Make sure you committed first (Step 5)
- Check if you're logged into GitHub in Cursor
- Try the three dots menu → "Push"

### "I get an error about authentication"
- Cursor should use your SSH key automatically
- If not, check: **File** → **Preferences** → **Settings**
- Search for "git" and check authentication

---

## 📸 What You Should See

After pressing `Ctrl+Shift+G`, your screen should look like:

```
┌──────────────────────────────────────────┐
│ CURSOR WINDOW                            │
│                                          │
│ ┌─────┐  ┌──────────────────────────┐  │
│ │ 📁  │  │                          │  │
│ │ 🔍  │  │   Your code files        │  │
│ │ 📂  │  │                          │  │
│ │ 🐛  │  │                          │  │
│ └─────┘  └──────────────────────────┘  │
│          ┌──────────────────────────┐  │
│          │ SOURCE CONTROL           │  │
│          │                          │  │
│          │ 📝 Changes               │  │
│          │   [ + ] Stage All        │  │
│          │                          │  │
│          │ Message: [___________]   │  │
│          │            [ ✓ ]         │  │
│          │                          │  │
│          │ [ ... ] → Push           │  │
│          └──────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## ✅ CHECKLIST

Go through this step by step:

- [ ] Pressed `Ctrl+Shift+G` or clicked Source Control icon
- [ ] See "SOURCE CONTROL" panel on the left
- [ ] See files listed under "Changes"
- [ ] Clicked "+" button to stage all files
- [ ] Typed "Add deployment configuration" in message box
- [ ] Clicked checkmark (✓) to commit
- [ ] Clicked three dots (...) → "Push"
- [ ] Checked GitHub and see files are there

---

**Try Step 1 now (press `Ctrl+Shift+G`) and tell me what you see!** 😊

