# Alternative Ways to Upload Files When SSH Password is Disabled

## Problem: Password authentication is disabled (common with Plesk)

## Solution 1: Use Plesk File Manager (Easiest!)

Since you have Plesk installed, use the web interface:

### Steps:

1. **Access Plesk:**
   - Open browser: `https://82.165.66.236:8443`
   - Or: `http://82.165.66.236:8443`
   - Login with your Plesk credentials

2. **Navigate to File Manager:**
   - Click "Files" in left menu
   - Navigate to `/var/www/` directory

3. **Upload files:**
   - Click "Upload Files" button
   - Select your `pactattack` folder from `F:\PA\`
   - Wait for upload to complete

4. **Extract if needed:**
   - If you uploaded a zip file, right-click and extract

---

## Solution 2: Use Plesk Terminal/SSH

Plesk has a built-in terminal:

1. **Access Plesk:** `https://82.165.66.236:8443`
2. **Go to:** Tools & Settings → Terminal (or SSH Access)
3. **Use the terminal** to:
   - Create directories
   - Use Plesk's file upload feature
   - Or enable SSH key from Plesk interface

---

## Solution 3: Enable Password Authentication via Plesk

1. **Login to Plesk:** `https://82.165.66.236:8443`
2. **Go to:** Tools & Settings → SSH Access
3. **Enable:** Password Authentication
4. **Save changes**
5. **Then try connecting again**

---

## Solution 4: Use Git Repository (If Your Code is on GitHub/GitLab)

If your code is in a Git repository:

### On Server (via Plesk Terminal):

```bash
cd /var/www
git clone <your-repo-url> pactattack
```

Or if you need to create a repo first, you can:
- Push your code to GitHub/GitLab
- Clone it on the server

---

## Solution 5: Use Plesk Git Extension

1. **Install Git Extension** in Plesk (if not already)
2. **Go to:** Domains → Your Domain → Git
3. **Add repository** and pull code

---

## Solution 6: Use FTP/SFTP via Plesk

1. **Create FTP user in Plesk:**
   - Go to: Domains → Your Domain → FTP Access
   - Create new FTP account
   - Note username and password

2. **Use FileZilla or WinSCP:**
   - Host: `82.165.66.236`
   - Port: `21` (FTP) or `22` (SFTP)
   - Username: (the FTP user you created)
   - Password: (the FTP password you set)
   - Protocol: SFTP

3. **Upload files** to `/var/www/pactattack`

---

## Solution 7: Use Web-based Upload Script

Create a temporary PHP upload script:

### On Server (via Plesk File Manager):

1. Create file: `/var/www/upload.php`
2. Content:
```php
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $target = '/var/www/pactattack/' . $_FILES['file']['name'];
    if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
        echo "Upload successful!";
    } else {
        echo "Upload failed!";
    }
}
?>
<form method="post" enctype="multipart/form-data">
    <input type="file" name="file">
    <button type="submit">Upload</button>
</form>
```

3. Access: `http://82.165.66.236/upload.php`
4. Upload files
5. **DELETE this file after use for security!**

---

## Solution 8: Contact Server Provider

If you have hosting provider support:
- Ask them to enable SSH password authentication temporarily
- Or ask them to add your SSH key
- Or use their file manager

---

## Recommended: Use Plesk File Manager (Solution 1)

This is the easiest and safest method since you already have Plesk installed.

### Quick Steps:
1. Go to: `https://82.165.66.236:8443`
2. Login to Plesk
3. Click "Files"
4. Navigate to `/var/www/`
5. Upload your `pactattack` folder

---

## After Uploading Files

Once files are uploaded via any method above, continue with:

```bash
# Via Plesk Terminal or SSH (after fixing access)
cd /var/www/pactattack/pactattack
ls -la  # Verify files are there
```

Then continue with deployment steps.

