# How to Add Your Public Key to the Server

## 🔑 Your Public Key

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
```

---

## ✅ METHOD 1: Via Plesk File Manager (Easiest - Recommended)

### Step 1: Login to Plesk
1. Open your browser
2. Go to: `https://82.165.66.236:8443` (or your Plesk URL)
3. Login with your Plesk credentials

### Step 2: Open File Manager
1. In Plesk, click on **"Files"** in the left sidebar
2. Or go to **"Tools & Settings"** → **"File Manager"**

### Step 3: Navigate to SSH Directory
1. In File Manager, navigate to: `/root/.ssh/`
2. If the `.ssh` folder doesn't exist, you may need to:
   - Click **"Show hidden files"** (if there's an option)
   - Or create it via Terminal first (see Method 2)

### Step 4: Edit authorized_keys
1. Look for file named `authorized_keys`
2. If it exists:
   - **Right-click** on `authorized_keys`
   - Click **"Edit"** or **"Download"** (download first as backup!)
   - Add your public key on a **new line** at the end
3. If it doesn't exist:
   - Click **"New"** → **"File"**
   - Name it: `authorized_keys`
   - Paste your public key:
     ```
     ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
     ```

### Step 5: Save the File
- Click **"Save"** or **"Upload"** (if you downloaded it)

### Step 6: Set Permissions (via Plesk Terminal)
1. Go to **"Tools & Settings"** → **"Terminal"** (or **"SSH Terminal"**)
2. Run these commands:
   ```bash
   chmod 700 /root/.ssh
   chmod 600 /root/.ssh/authorized_keys
   ```

### Step 7: Test Connection
From your PowerShell:
```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

---

## ✅ METHOD 2: Via Plesk Terminal (Quick)

### Step 1: Open Plesk Terminal
1. Login to Plesk
2. Go to **"Tools & Settings"** → **"Terminal"** (or **"SSH Terminal"**)

### Step 2: Run These Commands
Copy and paste this entire block:

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh

# Add your public key
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Verify it was added
cat ~/.ssh/authorized_keys
```

### Step 3: Test Connection
From your PowerShell:
```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

---

## ✅ METHOD 3: One-Line Command (Plesk Terminal)

If you're already in Plesk Terminal, just run this one command:

```bash
mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203" >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys && echo "Key added successfully!" && cat ~/.ssh/authorized_keys
```

---

## ✅ METHOD 4: Via Plesk Scheduled Task (Alternative)

If Terminal is not available:

1. Go to **"Tools & Settings"** → **"Scheduled Tasks"**
2. Click **"Add Task"**
3. **Command:**
   ```bash
   mkdir -p /root/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203" >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
   ```
4. **Run:** Select **"Once"** and run it **now**
5. Delete the task after it runs

---

## 🔍 Verify the Key Was Added

### Check via Plesk Terminal:
```bash
cat ~/.ssh/authorized_keys
```

You should see your public key in the output.

### Check Permissions:
```bash
ls -la ~/.ssh/
```

Should show:
- `drwx------` for `.ssh` directory (700)
- `-rw-------` for `authorized_keys` file (600)

---

## ✅ Test Your Connection

After adding the key, test from PowerShell:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

**Expected result:** You should connect **without** being asked for a password!

---

## 🚨 Troubleshooting

### "Permission denied (publickey)"
- Make sure the key was added correctly
- Check permissions: `chmod 600 ~/.ssh/authorized_keys`
- Verify the key is on a single line (no line breaks)

### "No such file or directory"
- Create the directory first: `mkdir -p ~/.ssh`

### "Connection refused"
- Check if SSH service is running: `systemctl status sshd`
- Verify firewall allows SSH: `ufw status`

---

## 📝 Quick Reference

**Your Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
```

**Server Location:** `/root/.ssh/authorized_keys`

**Required Permissions:**
- `/root/.ssh/` → `700` (drwx------)
- `/root/.ssh/authorized_keys` → `600` (-rw-------)

**Test Command:**
```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

---

## 🎯 Recommended Method

**Use METHOD 2 (Plesk Terminal)** - It's the fastest and most reliable!

Just copy-paste the commands and you're done! ✅

