# Setup Server with Matching SSH Keys - Complete Guide

## 🎯 Goal

Set up the server so that:
1. ✅ Your PC's private key matches the server's public key
2. ✅ SSH authentication works without password
3. ✅ You can connect and deploy automatically

---

## 📋 Pre-Setup Checklist

### On Your PC (Before Server Setup):

1. **Verify your key pair exists:**
   ```powershell
   # Check if your key exists
   Test-Path $env:USERPROFILE\.ssh\id_ed25519_pactattack
   
   # Display your public key
   Get-Content $env:USERPROFILE\.ssh\id_ed25519_pactattack.pub
   ```

2. **Your Public Key (save this):**
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
   ```

3. **If key doesn't exist, create it:**
   ```powershell
   ssh-keygen -t ed25519 -C "pactattack-deployment" -f "$env:USERPROFILE\.ssh\id_ed25519_pactattack" -N '""'
   ```

---

## 🚀 Server Setup Methods

### METHOD 1: Automated Script (Recommended)

**Step 1: Update the deployment script with your public key**

1. Open `deploy-with-ssh-key-setup.sh`
2. Find this line:
   ```bash
   YOUR_PUBLIC_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203"
   ```
3. Replace it with YOUR actual public key (from step 1 above)

**Step 2: Upload and run via Plesk**

**Option A: Via Plesk File Manager**
1. Login to Plesk
2. Go to **Files** → **File Manager**
3. Navigate to `/tmp/`
4. Upload `deploy-with-ssh-key-setup.sh`
5. Go to **Tools & Settings** → **Scheduled Tasks**
6. Create new task:
   - **Command:** `bash /tmp/deploy-with-ssh-key-setup.sh`
   - **Run:** Once, now
   - Execute it

**Option B: Via Plesk Git Deployment**
1. Push the script to GitHub
2. In Plesk Git, set deployment action to:
   ```bash
   cd /tmp && curl -fsSL https://raw.githubusercontent.com/belgarathe/pactattack/main/pactattack/deploy-with-ssh-key-setup.sh -o deploy.sh && chmod +x deploy.sh && bash deploy.sh
   ```

---

### METHOD 2: Manual Setup (If Script Doesn't Work)

**Step 1: Initial Server Access**

If you can access the server via Plesk File Manager or any method:

1. Create `/root/.ssh/` directory
2. Create `/root/.ssh/authorized_keys` file
3. Add your public key to the file

**Step 2: Via Plesk File Manager**

1. Login to Plesk
2. Go to **Files** → **File Manager**
3. Navigate to `/root/.ssh/`
4. Create file: `authorized_keys`
5. Paste your public key:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
   ```
6. Save

**Step 3: Set Permissions via Plesk Scheduled Task**

1. Go to **Tools & Settings** → **Scheduled Tasks**
2. Create task:
   ```bash
   chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
   ```
3. Run it

---

### METHOD 3: One-Line Setup (Plesk Scheduled Task)

If you have access to Plesk Scheduled Tasks:

1. Go to **Tools & Settings** → **Scheduled Tasks**
2. Create new task
3. **Command:**
   ```bash
   mkdir -p /root/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203" >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys && echo "SSH key added successfully"
   ```
4. **Run:** Once, now
5. Execute it

---

## ✅ Verification Steps

### Step 1: Verify Key on Server

**Via Plesk Scheduled Task:**
```bash
cat /root/.ssh/authorized_keys
```

Should show your public key.

### Step 2: Test Connection from PC

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

**Expected:** Should connect without password prompt! ✅

### Step 3: If Connection Works

You're all set! The key pair matches and authentication works.

---

## 🔧 Troubleshooting

### "Permission denied (publickey)"

**Possible causes:**
1. Public key not in `authorized_keys` → Add it
2. Wrong permissions → Run: `chmod 600 /root/.ssh/authorized_keys`
3. Wrong key → Verify you're using the matching key pair

**Fix:**
```bash
# On server (via Plesk Scheduled Task)
cat /root/.ssh/authorized_keys
ls -la /root/.ssh/
```

### "Connection refused"

**Possible causes:**
1. SSH service not running
2. Firewall blocking port 22

**Fix:**
```bash
# On server
systemctl status sshd
ufw status
```

### Key Still Not Working

**Double-check:**
1. Your PC's public key matches what's in server's `authorized_keys`
2. You're using the correct private key: `id_ed25519_pactattack`
3. Permissions are correct: `700` for `.ssh`, `600` for `authorized_keys`

---

## 📝 Key Matching Checklist

**Before Setup:**
- [ ] You have a key pair on your PC: `id_ed25519_pactattack` and `id_ed25519_pactattack.pub`
- [ ] You know your public key content

**During Setup:**
- [ ] Your public key is added to server's `/root/.ssh/authorized_keys`
- [ ] Permissions are set: `700` for `.ssh`, `600` for `authorized_keys`

**After Setup:**
- [ ] You can connect with: `ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236`
- [ ] No password prompt appears
- [ ] Connection is successful

---

## 🎯 Summary

**The Problem:** Server's public key ≠ Your PC's private key

**The Solution:** 
1. Add your PC's public key to server's `authorized_keys`
2. Ensure matching key pair
3. Set correct permissions

**Will This Fix Connection?** 
✅ **YES!** Once the public key on the server matches your private key on PC, SSH authentication will work.

**Quick Setup Command (Plesk Scheduled Task):**
```bash
mkdir -p /root/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203" >> /root/.ssh/authorized_keys && chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys
```

---

## 🚀 Next Steps After Setup

Once SSH connection works:

1. **Deploy your application** using the deployment scripts
2. **Set up GitHub Actions** for automatic deployment
3. **Disable password authentication** (optional, for security)
4. **Configure your application** and start using it!

---

## 📞 Quick Reference

**Your Public Key:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFQi3Zg50UnnNZyrLOCJ2SxjjV1wiKw3pSqF/uIofi5f pactattack-deployment-20251203
```

**Test Connection:**
```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pactattack root@82.165.66.236
```

**Server Key Location:** `/root/.ssh/authorized_keys`

