using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class HardeningConstraintsAndAuditImmutability : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ix_projects_created_by_user_id",
                table: "projects",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_uploaded_by_user_id",
                table: "stored_files",
                column: "uploaded_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_projects_users_created_by_user_id",
                table: "projects",
                column: "created_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stored_files_projects_project_id",
                table: "stored_files",
                column: "project_id",
                principalTable: "projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_stored_files_users_uploaded_by_user_id",
                table: "stored_files",
                column: "uploaded_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddCheckConstraint(
                name: "ck_users_username_length",
                table: "users",
                sql: "char_length(username) >= 3");

            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
                RETURNS trigger AS $$
                BEGIN
                    IF (TG_OP = 'TRUNCATE') THEN
                        RAISE EXCEPTION 'audit_logs is strictly append-only and cannot be truncated' USING ERRCODE = '42501';
                    ELSE
                        RAISE EXCEPTION 'audit_logs is strictly append-only and cannot be updated or deleted' USING ERRCODE = '42501';
                    END IF;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
                CREATE TRIGGER trg_audit_logs_immutable
                BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
                FOR EACH STATEMENT
                EXECUTE FUNCTION prevent_audit_log_mutation();

                -- Revoke truncate and trigger alteration privileges from runtime role if it exists
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'promogest_app') THEN
                        REVOKE TRUNCATE ON audit_logs FROM promogest_app;
                        REVOKE TRIGGER ON audit_logs FROM promogest_app;
                        GRANT SELECT, INSERT ON audit_logs TO promogest_app;
                    END IF;
                END
                $$;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
                DROP FUNCTION IF EXISTS prevent_audit_log_mutation();
                """);

            migrationBuilder.DropCheckConstraint(
                name: "ck_users_username_length",
                table: "users");

            migrationBuilder.DropForeignKey(
                name: "FK_projects_users_created_by_user_id",
                table: "projects");

            migrationBuilder.DropForeignKey(
                name: "FK_stored_files_projects_project_id",
                table: "stored_files");

            migrationBuilder.DropForeignKey(
                name: "FK_stored_files_users_uploaded_by_user_id",
                table: "stored_files");

            migrationBuilder.DropIndex(
                name: "ix_projects_created_by_user_id",
                table: "projects");

            migrationBuilder.DropIndex(
                name: "ix_stored_files_uploaded_by_user_id",
                table: "stored_files");
        }
    }
}
