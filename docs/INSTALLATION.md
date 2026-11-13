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
   .\deploy\windows\install-service.ps1 -ConfigureFirewall
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
