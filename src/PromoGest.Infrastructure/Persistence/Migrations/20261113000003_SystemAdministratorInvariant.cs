using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class SystemAdministratorInvariant : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                CREATE OR REPLACE FUNCTION protect_system_administrator()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF (TG_OP = 'UPDATE') THEN
                        IF (OLD.is_system_administrator = TRUE AND (NEW.is_system_administrator = FALSE OR NEW.is_active = FALSE)) THEN
                            IF (SELECT COUNT(*) FROM users WHERE is_system_administrator = TRUE AND is_active = TRUE AND id <> OLD.id) = 0 THEN
                                RAISE EXCEPTION 'Cannot demote or deactivate the last active System Administrator.' USING ERRCODE = '42501';
                            END IF;
                        END IF;
                        RETURN NEW;
                    END IF;

                    IF (TG_OP = 'DELETE') THEN
                        IF (OLD.is_system_administrator = TRUE) THEN
                            IF (SELECT COUNT(*) FROM users WHERE is_system_administrator = TRUE AND is_active = TRUE AND id <> OLD.id) = 0 THEN
                                RAISE EXCEPTION 'Cannot delete the last active System Administrator.' USING ERRCODE = '42501';
                            END IF;
                        END IF;
                        RETURN OLD;
                    END IF;

                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_protect_system_administrator ON users;
                CREATE TRIGGER trg_protect_system_administrator
                BEFORE UPDATE OR DELETE ON users
                FOR EACH ROW
                EXECUTE FUNCTION protect_system_administrator();
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS trg_protect_system_administrator ON users;
                DROP FUNCTION IF EXISTS protect_system_administrator();
                """);
        }
    }
}
