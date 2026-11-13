# PROMO GEST — Local Installation & Deployment Guide

## 1. External Dependencies (Organization Server)
- **Operating System**: Windows Server 2022/2025 or Windows 10/11 Pro (or Linux Ubuntu 24.04 LTS).
- **Database**: PostgreSQL 18 (`psql`, `pg_dump`, `pg_restore`), bound strictly to `127.0.0.1:5432`.
- **Application Runtime**: Self-contained .NET 10 LTS publish output from `scripts/build-production.ps1` (or `.NET 10 ASP.NET Core Runtime` if framework-dependent).
- **Local HTTPS Reverse Proxy**: Caddy 2 (`deploy/windows/caddy-local-https.Caddyfile` using `tls internal` internal PKI) or Nginx.
- **Node.js**: **NOT required** on the production organization server (used only on the build machine to compile `apps/local-web`).

## 2. Administrative Privileges & Firewall Assumptions
- **Administrator / Elevated PowerShell** is required to:
  - Install and start the `PromoGestLocalErp` Windows Service (`#Requires -RunAsAdministrator` in `deploy/windows/install-service.ps1`).
  - Open inbound TCP `443` on Private/Domain firewall profiles (`-ConfigureFirewall`) and trust Caddy's internal root CA on LAN workstations.
  - Register a scheduled Windows Task Scheduler backup job (`Register-ScheduledTask`).
- **Firewall rules**:
  - Allow inbound LAN TCP `443` (Caddy local HTTPS).
  - Keep ASP.NET Core Kestrel (`127.0.0.1:5080`) and PostgreSQL (`127.0.0.1:5432`) bound exclusively to loopback; do **not** open ports `5080` or `5432` to the LAN or WAN.

## 3. Step 1 — Provision PostgreSQL 18
1. Install PostgreSQL 18 locally binding `listen_addresses = '127.0.0.1'` (`deploy/postgresql/postgresql.recommended.conf`).
2. Edit `deploy/postgresql/00-init-db.sql` to set independent strong local passwords for both `promogest_owner` and `promogest_app`. The owner is deliberately `NOCREATEDB`/`NOCREATEROLE`; the `postgres` provisioning identity creates the database, while the owner only owns application objects and runs migrations. The app identity has no database/schema creation or migration privileges.
3. Execute as `postgres` superuser:
   ```bash
   psql -U postgres -f deploy/postgresql/00-init-db.sql
   ```

## 4. Step 2 — Build Production Artifact (Build Machine)
On Windows:
```powershell
.\scripts\build-production.ps1
```
On Linux:
```bash
./scripts/build-production.sh
```
This runs the unified workspace lint/test/build in `apps/local-web`, copies static assets into `src/PromoGest.Api/wwwroot/`, runs .NET unit tests, and publishes the self-contained server to `artifacts/publish/`.

## 5. Step 3 — Configure, migrate, and install the Windows service
1. Copy `artifacts/publish/*` to `C:\PromoGest\app\`.
2. Copy `deploy/windows/appsettings.Production.template.json` to `C:\PromoGest\app\appsettings.Production.json`. Set `ConnectionStrings:DefaultConnection` to the **promogest_app** runtime identity; do not use the migration owner in the running service configuration.
3. Stage the local HTTPS configuration and maintenance scripts:
   ```powershell
   New-Item -ItemType Directory -Force C:\PromoGest\caddy, C:\PromoGest\scripts | Out-Null
   Copy-Item .\deploy\windows\caddy-local-https.Caddyfile C:\PromoGest\caddy\Caddyfile -Force
   Copy-Item .\scripts\backup-promogest.ps1, .\scripts\restore-promogest.ps1 C:\PromoGest\scripts\ -Force
   ```
4. Apply database migrations once, explicitly as **promogest_owner**. Obtain the password from the organization's protected secret store; never commit it or put it in a script:
   ```powershell
   $env:PROMOGEST_MIGRATE_DB_CONNECTION = "Host=127.0.0.1;Port=5432;Database=promogest;Username=promogest_owner;Password=REPLACE_WITH_OWNER_SECRET"
   try {
       & C:\PromoGest\app\PromoGest.Api.exe --migrate
       if ($LASTEXITCODE -ne 0) { throw "PROMO GEST database migration failed." }
   }
   finally {
       Remove-Item Env:PROMOGEST_MIGRATE_DB_CONNECTION -ErrorAction SilentlyContinue
   }
   ```
   Do not run the service as the owner identity. Normal service operation must use `promogest_app`.
5. Run in an elevated PowerShell prompt:
   ```powershell
   .\deploy\windows\install-service.ps1 -ConfigureFirewall -BackupRoot "D:\PromoGestBackups"
   ```
   The installer creates a read-only `C:\PromoGest\scripts` directory ACL for the service identity; the Task Scheduler maintenance task runs with its own administrative/SYSTEM rights.
6. Verify local loopback health endpoints:
   - `http://127.0.0.1:5080/health/live` -> `200 OK`
   - `http://127.0.0.1:5080/health/ready` -> `200 OK` (`databaseConnected: true`, `isInitialized: false`)

## 6. Step 4 — Automated Daily Backups (Windows Task Scheduler)
Register a daily local backup task running as `SYSTEM`. Configure the SYSTEM account's protected PostgreSQL `pgpass` file with the `promogest_owner` credential; the restore drill also needs `postgres` for provisioning and `promogest_app` for runtime verification. The backup task stops `PromoGestLocalErp` during the backup window and restarts it automatically after the database, storage, Data Protection keys, and Caddy configuration have been archived:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\PromoGest\scripts\backup-promogest.ps1 -BackupRoot D:\PromoGestBackups"
$trigger = New-ScheduledTaskTrigger -Daily -At 22:00
Register-ScheduledTask -TaskName "PromoGestNightlyBackup" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest
```

## 7. Step 5 — Local LAN HTTPS & First-Run Wizard
1. Start Caddy using the staged `C:\PromoGest\caddy\Caddyfile` and distribute Caddy's local root CA certificate to office workstations.
2. Open `https://promogest.lan` (or the configured LAN IP) from the System Administrator workstation.
3. Complete the **First-Run Installation Wizard** (Organization legal/fiscal details + the single System Administrator account).
4. Once initialized, the wizard is permanently locked. If the System Administrator ever locks out or loses their password, use the local server console CLI (`PromoGest.Api.exe --unlock-admin` or `--reset-admin-password`).

## 8. Linux deployment (Ubuntu 24.04 LTS)

The Linux deployment uses the supplied systemd units and the self-contained Linux x64 artifact. The API and PostgreSQL remain bound to loopback; Caddy is the only LAN-facing service.

1. **Provision PostgreSQL.** Edit `deploy/postgresql/00-init-db.sql`, replace both password placeholders with independent generated secrets, then execute it as the local PostgreSQL administrator:
   ```bash
   sudo -u postgres psql -f deploy/postgresql/00-init-db.sql
   ```
   Keep `promogest_owner` for the one-time migration command and `promogest_app` in normal application runtime. Never configure the API service with the owner identity.

2. **Create the service account and directories.**
   ```bash
   getent passwd promogest >/dev/null || sudo useradd --system --home /var/lib/promogest --shell /usr/sbin/nologin promogest
   sudo install -d -o root -g root -m 0755 /opt/promogest /opt/promogest/app
   sudo install -d -o root -g promogest -m 0750 /etc/promogest
   sudo install -d -o promogest -g promogest -m 0750 /var/lib/promogest/storage /var/lib/promogest/dataprotection-keys
   sudo install -d -o root -g root -m 0700 /var/backups/promogest
   sudo cp -a artifacts/publish/. /opt/promogest/app/
   sudo chown -R root:root /opt/promogest/app
   sudo chmod -R a+rX /opt/promogest/app
   ```

3. **Install application settings and secrets.**
   ```bash
   sudo cp deploy/linux/appsettings.Production.template.json /opt/promogest/app/appsettings.Production.json
   sudo cp deploy/linux/promogest.env.template /etc/promogest/promogest.env
   sudo chown root:promogest /etc/promogest/promogest.env
   sudo chmod 0640 /etc/promogest/promogest.env
   sudoedit /etc/promogest/promogest.env
   ```
   Replace the runtime database secret and Data Protection certificate password with values from the organization's protected secret store. The environment file is read by systemd and must not be committed or copied into backup archives.

4. **Create the Linux Data Protection certificate.** Run this step in a root shell (`sudo -i`). Generate a password-protected PKCS#12 file at the exact path configured in `appsettings.Production.json`. Keep the temporary private key files in a root-only temporary directory and delete them after exporting the PFX:
   ```bash
   sudo install -d -o root -g root -m 0700 /root/promogest-dp-cert
   read -r -s -p 'Data Protection certificate password: ' PROMOGEST_DATA_PROTECTION_CERT_PASSWORD
   printf '\n'
   export PROMOGEST_DATA_PROTECTION_CERT_PASSWORD
   openssl req -x509 -newkey rsa:3072 -nodes \
     -keyout /root/promogest-dp-cert/private.key \
     -out /root/promogest-dp-cert/certificate.crt \
     -days 3650 -subj '/CN=PROMO GEST Data Protection'
   openssl pkcs12 -export \
     -out /var/lib/promogest/dataprotection-keys/protection.pfx \
     -inkey /root/promogest-dp-cert/private.key \
     -in /root/promogest-dp-cert/certificate.crt \
     -passout env:PROMOGEST_DATA_PROTECTION_CERT_PASSWORD
   unset PROMOGEST_DATA_PROTECTION_CERT_PASSWORD
   sudo chown root:promogest /var/lib/promogest/dataprotection-keys/protection.pfx
   sudo chmod 0640 /var/lib/promogest/dataprotection-keys/protection.pfx
   sudo rm -rf /root/promogest-dp-cert
   ```
   Enter the same certificate password in `/etc/promogest/promogest.env`. Do not lose the PFX or its password: existing protected cookies and other Data Protection payloads depend on this key ring.

5. **Apply migrations as the database owner.** This command uses the migration-only connection variable; it does not start the runtime service or require the Data Protection certificate:
   ```bash
   read -r -s -p 'promogest_owner database password: ' PROMOGEST_OWNER_DB_PASSWORD
   printf '\n'
   export PROMOGEST_MIGRATE_DB_CONNECTION="Host=127.0.0.1;Port=5432;Database=promogest;Username=promogest_owner;Password=${PROMOGEST_OWNER_DB_PASSWORD}"
   /opt/promogest/app/PromoGest.Api --migrate
   unset PROMOGEST_MIGRATE_DB_CONNECTION PROMOGEST_OWNER_DB_PASSWORD
   ```
   Stop if the command returns a non-zero exit code. The ordinary service uses only the `promogest_app` connection from `promogest.env`.

6. **Install the systemd and Caddy configuration.** Edit `deploy/linux/Caddyfile` to use the server's reserved LAN name or address, and copy the files:
   ```bash
   sudo install -m 0644 deploy/linux/promogest.service /etc/systemd/system/promogest.service
   sudo install -m 0644 deploy/linux/promogest-backup.service /etc/systemd/system/promogest-backup.service
   sudo install -m 0644 deploy/linux/promogest-backup.timer /etc/systemd/system/promogest-backup.timer
   sudo install -o root -g root -m 0750 scripts/backup-promogest.sh /usr/local/sbin/backup-promogest.sh
   sudo install -m 0644 deploy/linux/Caddyfile /etc/caddy/Caddyfile
   ```

7. **Configure the backup credential file and enable services.** The backup unit runs with `ProtectHome=true` and therefore reads `/etc/promogest/pgpass`, not `/root/.pgpass`. Create it as root with mode `0600`. Add a `promogest_owner` entry for the production database; for the full restore drill also add wildcard database entries for `postgres`, `promogest_owner`, and `promogest_app`, because the scratch database name is generated at runtime. See [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md) for the exact format. Then:
   ```bash
   sudo install -o root -g root -m 0600 /dev/null /etc/promogest/pgpass
   sudoedit /etc/promogest/pgpass
   sudo systemctl daemon-reload
   sudo systemctl enable --now promogest.service
   sudo systemctl enable --now caddy.service
   sudo systemctl enable --now promogest-backup.timer
   ```
   The timer starts the consistent backup service daily at 22:00 with a randomized delay. The backup includes the database, local documents, Data Protection key ring/certificate, sanitized settings, Caddy configuration, and a SHA-256 manifest.

8. **Validate LAN access and recovery.** Confirm the API is healthy on `127.0.0.1:5080`, open `https://promogest.lan` from a workstation whose DNS/hosts entry points to the server, and install Caddy's internal root CA certificate on trusted workstations. Allow inbound LAN TCP `443` only; keep `5080` and `5432` on loopback. Before production use, perform the mandatory Linux restore drill in [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md).

Do not copy a Windows DPAPI key ring to Linux or vice versa. A Linux restore requires the matching PFX certificate and its password; a same-machine Windows restore depends on that machine's DPAPI scope.

### Linux local administrator recovery

The console recovery commands do not initialize Data Protection, so they remain usable if the Linux PFX/key ring is missing or damaged. They still require the runtime database connection. Do not source `promogest.env` as a shell script: its PostgreSQL connection string contains semicolons and is a systemd environment file, not a Bash file. Supply the connection securely for the one-off command:

```bash
read -r -s -p 'promogest_app database password: ' PROMOGEST_RUNTIME_DB_PASSWORD
printf '\n'
export ConnectionStrings__DefaultConnection="Host=127.0.0.1;Port=5432;Database=promogest;Username=promogest_app;Password=${PROMOGEST_RUNTIME_DB_PASSWORD}"
/opt/promogest/app/PromoGest.Api --unlock-admin
unset ConnectionStrings__DefaultConnection PROMOGEST_RUNTIME_DB_PASSWORD
```

For password reset, use the same environment setup and run `/opt/promogest/app/PromoGest.Api --reset-admin-password`; enter the new administrator password at the masked console prompt. These commands must be run from a trusted local administrative session. They are not HTTP endpoints.
