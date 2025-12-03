# SSH Key Authentication Fix - Complete Solution

## 🔍 Problem Diagnosis

**Why SSH keys stopped working:**
1. ✅ Your public key exists locally: `C:\Users\Devian\.ssh\id_rsa.pub`
2. ❌ Your public key is **NOT** in the server's `/root/.ssh/authorized_keys` file
3. ❌ Server has password authentication **disabled** (only accepts public keys)
4. ❌ This creates a "chicken and egg" problem - can't connect to add the key!

**Your public key:**
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1fQIlrv3I/4CksKdPHfVfkOhUc92H9KQZco51T0Sowy7kcpzHqrx1S+8hgxjZxYKVAL2IHYlcvuID9UiqNIYCiqgkm4ZudiKKdoVLscUvX5ljwMZwxsuo/XAtYMZu4fsfLtSyiZfW826T6ioajanHfJE0Cl+tzjOE0cbyPUQS/3mhjYdriQBts8y6JGVq/4xlkhkID3P2KwbsgasEv6cr/XhRP6waYmuB6kfeq0xHjeHXmR1v3s27rz5p77A37zi4ZlwtD2u0DtFnRClpk9Jr4fuHVz8mqt/oHziOcoxCvMcy5q5R9btInOCe6JMqEcec+GFAV7WuW26qn+7Bx0iixzOt0sci6cDYamgOiLvTDayfNvTt44Yokyu73hzwq+47SVhohX8/FR0irAmaszE/+V5SevwsPm+oSkZ0lAb0QiKyqrGYjXKZfsZq1Q2h15+//o1LShL+MX2e6Pt7fXXC6KaLRHo3WQ1RjtZzSZaBVb/Wuxj52qBeH/w+gQUyNdp7YjivnaSWuGhqSYdIYje43sAamtd1SBpEGwlJ5AtudKHwM7hSGUpD/yE2NXLFb0E2ef2Dh6cZUPePj960U9IvUhKUOI4sOHLr7wty13+bJpnSDkuHD2P/qI6uUAcTn/KCYVehVjuCzBwd8ijE0KLcDj1//NBh8rJFnKH7x8VQ0w== pactattack-server-82.165.66.236
```

---

## ✅ SOLUTION 1: Via Plesk File Manager (Easiest)

### Step 1: Access Plesk File Manager
1. Login to Plesk: `http://82.165.66.236:8443` (or your Plesk URL)
2. Go to **Files** → **File Manager**
3. Navigate to `/root/.ssh/`

### Step 2: Edit authorized_keys
1. If `authorized_keys` exists, **download it first** (backup)
2. Click **Edit** on `authorized_keys` (or create new file if it doesn't exist)
3. **Add this line** (paste your public key):
   ```
   ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1fQIlrv3I/4CksKdPHfVfkOhUc92H9KQZco51T0Sowy7kcpzHqrx1S+8hgxjZxYKVAL2IHYlcvuID9UiqNIYCiqgkm4ZudiKKdoVLscUvX5ljwMZwxsuo/XAtYMZu4fsfLtSyiZfW826T6ioajanHfJE0Cl+tzjOE0cbyPUQS/3mhjYdriQBts8y6JGVq/4xlkhkID3P2KwbsgasEv6cr/XhRP6waYmuB6kfeq0xHjeHXmR1v3s27rz5p77A37zi4ZlwtD2u0DtFnRClpk9Jr4fuHVz8mqt/oHziOcoxCvMcy5q5R9btInOCe6JMqEcec+GFAV7WuW26qn+7Bx0iixzOt0sci6cDYamgOiLvTDayfNvTt44Yokyu73hzwq+47SVhohX8/FR0irAmaszE/+V5SevwsPm+oSkZ0lAb0QiKyqrGYjXKZfsZq1Q2h15+//o1LShL+MX2e6Pt7fXXC6KaLRHo3WQ1RjtZzSZaBVb/Wuxj52qBeH/w+gQUyNdp7YjivnaSWuGhqSYdIYje43sAamtd1SBpEGwlJ5AtudKHwM7hSGUpD/yE2NXLFb0E2ef2Dh6cZUPePj960U9IvUhKUOI4sOHLr7wty13+bJpnSDkuHD2P/qI6uUAcTn/KCYVehVjuCzBwd8ijE0KLcDj1//NBh8rJFnKH7x8VQ0w== pactattack-server-82.165.66.236
   ```
4. **Save** the file

### Step 3: Set Permissions (via Plesk Terminal)
1. Go to **Tools & Settings** → **Terminal** (or **SSH Terminal**)
2. Run these commands:
   ```bash
   chmod 700 /root/.ssh
   chmod 600 /root/.ssh/authorized_keys
   ```

### Step 4: Test Connection
From your PowerShell:
```powershell
ssh -i $env:USERPROFILE\.ssh\id_rsa root@82.165.66.236
```

---

## ✅ SOLUTION 2: Via Plesk Terminal/Console

### Step 1: Open Plesk Terminal
1. Login to Plesk
2. Go to **Tools & Settings** → **Terminal** (or **SSH Terminal**)

### Step 2: Run These Commands
```bash
# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1fQIlrv3I/4CksKdPHfVfkOhUc92H9KQZco51T0Sowy7kcpzHqrx1S+8hgxjZxYKVAL2IHYlcvuID9UiqNIYCiqgkm4ZudiKKdoVLscUvX5ljwMZwxsuo/XAtYMZu4fsfLtSyiZfW826T6ioajanHfJE0Cl+tzjOE0cbyPUQS/3mhjYdriQBts8y6JGVq/4xlkhkID3P2KwbsgasEv6cr/XhRP6waYmuB6kfeq0xHjeHXmR1v3s27rz5p77A37zi4ZlwtD2u0DtFnRClpk9Jr4fuHVz8mqt/oHziOcoxCvMcy5q5R9btInOCe6JMqEcec+GFAV7WuW26qn+7Bx0iixzOt0sci6cDYamgOiLvTDayfNvTt44Yokyu73hzwq+47SVhohX8/FR0irAmaszE/+V5SevwsPm+oSkZ0lAb0QiKyqrGYjXKZfsZq1Q2h15+//o1LShL+MX2e6Pt7fXXC6KaLRHo3WQ1RjtZzSZaBVb/Wuxj52qBeH/w+gQUyNdp7YjivnaSWuGhqSYdIYje43sAamtd1SBpEGwlJ5AtudKHwM7hSGUpD/yE2NXLFb0E2ef2Dh6cZUPePj960U9IvUhKUOI4sOHLr7wty13+bJpnSDkuHD2P/qI6uUAcTn/KCYVehVjuCzBwd8ijE0KLcDj1//NBh8rJFnKH7x8VQ0w== pactattack-server-82.165.66.236" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Verify
cat ~/.ssh/authorized_keys
```

---

## ✅ SOLUTION 3: Temporarily Enable Password Auth (Advanced)

**⚠️ Only if you have server console access or can edit SSH config via Plesk**

### Step 1: Enable Password Authentication Temporarily
Via Plesk File Manager, edit `/etc/ssh/sshd_config`:
```
PasswordAuthentication yes
PubkeyAuthentication yes
```

### Step 2: Restart SSH Service
```bash
systemctl restart sshd
```

### Step 3: Add Your Key (from PowerShell)
```powershell
$key = Get-Content $env:USERPROFILE\.ssh\id_rsa.pub
echo $key | plink -ssh -pw Lordamun1948kickboard root@82.165.66.236 "mkdir -p ~/.ssh && echo '$key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
```

### Step 4: Disable Password Auth Again (for security)
Edit `/etc/ssh/sshd_config`:
```
PasswordAuthentication no
PubkeyAuthentication yes
```
Restart: `systemctl restart sshd`

---

## ✅ SOLUTION 4: Use Plesk Scheduled Task

1. Go to **Tools & Settings** → **Scheduled Tasks**
2. Create new task
3. **Command:**
   ```bash
   mkdir -p /root/.ssh && echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC1fQIlrv3I/4CksKdPHfVfkOhUc92H9KQZco51T0Sowy7kcpzHqrx1S+8hgxjZxYKVAL2IHYlcvuID9UiqNIYCiqgkm4ZudiKKdoVLscUvX5ljwMZwxsuo/XAtYMZu4fsfLtSyiZfW826T6ioajanHfJE0Cl+tzjOE0cbyPUQS/3mhjYdriQBts8y6JGVq/4xlkhkID3P2KwbsgasEv6cr/XhRP6waYmuB6kfeq0xHjeHXmR1v3s27rz5p77A37zi4ZlwtD2u0DtFnRClpk9Jr4fuHVz8mqt/oHziOcoxCvMcy5q5R9btInOCe6JMqEcec+GFAV7WuW26qn+7Bx0iixzOt0sci6cDYamgOiLvTDayfNvTt44Yokyu73hzwq+47SVhohX8/FR0irAmaszE/+V5SevwsPm+oSkZ0lAb0QiKyqrGYjXKZfsZq1Q2h15+//o1LShL+MX2e6Pt7fXXC6KaLRHo3WQ1RjtZzSZaBVb/Wuxj52qBeH/w+gQUyNdp7YjivnaSWuGhqSYdIYje43sAamtd1SBpEGwlJ5AtudKHwM7hSGUpD/yE2NXLFb0E2ef2Dh6cZUPePj960U9IvUhKUOI4sOHLr7wty13+bJpnSDkuHD2P/qI6uUAcTn/KCYVehVjuCzBwd8ijE0KLcDj1//NBh8rJFnKH7x8VQ0w== pactattack-server-82.165.66.236" >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys && chmod 700 /root/.ssh
   ```
4. Run it **once** manually
5. Delete the task after it runs

---

## 🔍 Why It Stopped Working

**Possible reasons:**
1. Server was reinstalled/reset
2. `authorized_keys` file was deleted or overwritten
3. SSH configuration changed (password auth disabled)
4. File permissions changed on `/root/.ssh/`
5. Server security update removed keys

**The key worked "in the beginning" because:**
- The public key was in `authorized_keys` at that time
- Password authentication may have been enabled
- The server configuration was different

---

## ✅ After Fixing - Test Connection

```powershell
# Test SSH connection
ssh -i $env:USERPROFILE\.ssh\id_rsa root@82.165.66.236

# Should connect without password prompt!
```

---

## 📝 Quick Reference

**Your Public Key Location:** `C:\Users\Devian\.ssh\id_rsa.pub`

**Server Key Location:** `/root/.ssh/authorized_keys`

**Required Permissions:**
- `/root/.ssh/` → `700` (drwx------)
- `/root/.ssh/authorized_keys` → `600` (-rw-------)

**Test Command:**
```powershell
ssh -i $env:USERPROFILE\.ssh\id_rsa root@82.165.66.236 "echo 'SSH key works!'"
```

---

## 🎯 Recommended Solution

**Use SOLUTION 1 (Plesk File Manager)** - It's the easiest and most reliable method!

