# Upload Files Using Plesk (Recommended Method)

## Step 1: Access Plesk

1. Open your browser
2. Go to: `https://82.165.66.236:8443`
   - Or: `http://82.165.66.236:8443`
3. Login with your Plesk credentials
   - (You may have received these when the server was set up)

## Step 2: Access File Manager

1. In Plesk dashboard, look for **"Files"** in the left sidebar
2. Click on **"Files"**
3. You'll see the file browser

## Step 3: Navigate to Upload Location

1. In the file browser, navigate to: `/var/www/`
   - You can type the path in the address bar or click through folders
   - Click "Home" then navigate to `var` → `www`

## Step 4: Upload Your Files

### Option A: Upload Folder via ZIP

1. **On your Windows machine:**
   - Navigate to `F:\PA\`
   - Right-click on `pactattack` folder
   - Select "Send to" → "Compressed (zipped) folder"
   - This creates `pactattack.zip`

2. **In Plesk File Manager:**
   - Click "Upload Files" button
   - Select `pactattack.zip`
   - Wait for upload

3. **Extract the ZIP:**
   - Right-click on `pactattack.zip`
   - Select "Extract"
   - Choose extraction location: `/var/www/`
   - This creates `/var/www/pactattack/`

### Option B: Upload Individual Files

1. Click "Upload Files"
2. Select multiple files from `F:\PA\pactattack\`
3. Upload them one by one or in batches

**Note:** This is slower for large projects. Use ZIP method instead.

## Step 5: Verify Files Are Uploaded

1. In Plesk File Manager, navigate to `/var/www/pactattack/pactattack/`
2. You should see:
   - `package.json`
   - `src/` folder
   - `prisma/` folder
   - Other project files

## Step 6: Use Plesk Terminal for Next Steps

1. In Plesk, go to **"Tools & Settings"**
2. Look for **"Terminal"** or **"SSH Access"**
3. Click to open terminal

**Or access via SSH:** (once you fix SSH access)

```bash
cd /var/www/pactattack/pactattack
ls -la
```

## Alternative: Create FTP Account in Plesk

If File Manager doesn't work, create an FTP account:

### Steps:

1. **In Plesk:** Domains → (your domain) → **FTP Access**
2. **Click:** "Add FTP Account"
3. **Create account:**
   - FTP account name: `deploy`
   - Password: (create a secure password)
   - Home directory: `/var/www`
4. **Save**

### Use FileZilla to Upload:

1. Download FileZilla: https://filezilla-project.org/
2. Connect:
   - Host: `82.165.66.236`
   - Protocol: **SFTP**
   - Port: `22`
   - Username: `deploy` (or the FTP user you created)
   - Password: (the password you set)
3. Navigate to `/var/www/` on server
4. Upload your `pactattack` folder

## After Files Are Uploaded

Continue with deployment:

```bash
cd /var/www/pactattack/pactattack
# Then follow deployment steps
```

## Troubleshooting

### "Access Denied" in File Manager?
- Make sure you're logged in as admin
- Check file permissions in Plesk

### Upload Fails?
- Check disk space: Plesk → Tools & Settings → System Information
- Try smaller batches
- Use ZIP method instead

### Can't Find Files?
- Check upload location
- Look in `/var/www/` or check Plesk's default document root

