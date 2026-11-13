using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class AuditLogRuntimePermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'promogest_app') THEN
                        EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE audit_logs FROM promogest_app';
                        EXECUTE 'GRANT SELECT, INSERT ON TABLE audit_logs TO promogest_app';
                    END IF;
                END
                $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'promogest_app') THEN
                        EXECUTE 'GRANT UPDATE, DELETE ON TABLE audit_logs TO promogest_app';
                    END IF;
                END
                $$;
                """);
        }
    }
}
