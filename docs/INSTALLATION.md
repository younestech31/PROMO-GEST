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
2. Edit `deploy/postgresql/00-init-db.sql` to set a strong local password for `promogest_app`.
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

## 5. Step 3 — Configure & Install Windows Service
1. Copy `artifacts/publish/*` to `C:\PromoGest\app\`.
2. Copy `deploy/windows/appsettings.Production.template.json` to `C:\PromoGest\app\appsettings.Production.json` and replace `REPLACE_WITH_LOCAL_SECRET`.
3. Run in an elevated PowerShell prompt:
   ```powershell
   .\deploy\windows\install-service.ps1 -ConfigureFirewall
   ```
4. Verify local loopback health endpoints:
   - `http://127.0.0.1:5080/health/live` -> `200 OK`
   - `http://127.0.0.1:5080/health/ready` -> `200 OK` (`databaseConnected: true`, `isInitialized: false`)

## 6. Step 4 — Automated Daily Backups (Windows Task Scheduler)
Register a daily local backup task running as `SYSTEM` (using `.pgpass` or local service account):
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\PromoGest\scripts\backup-promogest.ps1 -BackupRoot D:\PromoGestBackups"
$trigger = New-ScheduledTaskTrigger -Daily -At 22:00
Register-ScheduledTask -TaskName "PromoGestNightlyBackup" -Action $action -Trigger $trigger -User "SYSTEM" -RunLevel Highest
```

## 7. Step 5 — Local LAN HTTPS & First-Run Wizard
1. Start Caddy with `deploy/windows/caddy-local-https.Caddyfile` and distribute Caddy's local root CA certificate to office workstations.
2. Open `https://promogest.lan` (or the configured LAN IP) from the System Administrator workstation.
3. Complete the **First-Run Installation Wizard** (Organization legal/fiscal details + the single System Administrator account).
4. Once initialized, the wizard is permanently locked. If the System Administrator ever locks out or loses their password, use the local server console CLI (`PromoGest.Api.exe --unlock-admin` or `--reset-admin-password`).
