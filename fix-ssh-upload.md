# Fix SSH Upload Permission Denied Error

## Problem: "Permission denied (publickey)"

This means your SSH key isn't set up on the server yet.

## Solution 1: Add Your SSH Key to Server (Recommended)

### Step 1: Copy your public key

On your Windows machine (PowerShell):

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

This copies your public key to clipboard.

### Step 2: Connect to server and add the key

```powershell
ssh root@82.165.66.236
# Enter password when prompted: jYnwtLDw8QEn8r
```

### Step 3: On the server, add your key

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key (paste the key you copied)
nano ~/.ssh/authorized_keys
```

**Paste your public key** (the one that starts with `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email`)

Save: `Ctrl+X`, `Y`, `Enter`

```bash
# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Test connection

Exit and reconnect:
```bash
exit
```

Now try connecting again (should work without password):
```powershell
ssh root@82.165.66.236
```

---

## Solution 2: Use Password Authentication for SCP

If you want to upload files using password (temporary solution):

### Windows PowerShell:

```powershell
# Install OpenSSH client if needed
# Then use this command:
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no -r pactattack root@82.165.66.236:/var/www/
```

**Note:** This might not work if password auth is disabled. Use Solution 1 instead.

---

## Solution 3: Use WinSCP (GUI Tool - Easiest)

1. **Download WinSCP:** https://winscp.net/eng/download.php

2. **Connect:**
   - Host: `82.165.66.236`
   - Username: `root`
   - Password: `jYnwtLDw8QEn8r`
   - Protocol: SFTP

3. **Upload:**
   - Navigate to `/var/www/` on server
   - Drag and drop your `pactattack` folder from `F:\PA\` to server

---

## Solution 4: Use FileZilla (Alternative GUI)

1. **Download FileZilla:** https://filezilla-project.org/

2. **Connect:**
   - Host: `sftp://82.165.66.236`
   - Username: `root`
   - Password: `jYnwtLDw8QEn8r`
   - Port: `22`

3. **Upload:** Drag and drop your folder

---

## Solution 5: Manual File Transfer via Git

If your code is in a Git repository:

### On Server:
```bash
cd /var/www
git clone <your-repo-url> pactattack
cd pactattack
```

---

## Recommended: Fix SSH Key First (Solution 1)

This is the best long-term solution. Once your SSH key is set up, you won't need passwords anymore.

### Quick Command Summary:

**On Windows (PowerShell):**
```powershell
# Get your public key
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

**Copy the output, then on server:**
```bash
ssh root@82.165.66.236
# Enter password: jYnwtLDw8QEn8r

mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIS8KWPJAY+zcHP/4urgzMDzWP1y6X5Ti0UyG06ZN01n tim@meggert.email" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

**Then test:**
```powershell
ssh root@82.165.66.236
# Should connect without password now!
```

---

## After Fixing SSH

Once SSH key is working, you can upload files:

```powershell
scp -r pactattack root@82.165.66.236:/var/www/
```

