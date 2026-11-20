using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PromoGest.Infrastructure.Persistence;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261120130000_RequirePasswordChangeAfterAdminReset")]
public partial class RequirePasswordChangeAfterAdminReset : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "must_change_password_at_next_login",
            table: "users",
            type: "boolean",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "password_change_required_until_utc",
            table: "users",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddCheckConstraint(
            name: "ck_users_password_change_deadline_consistent",
            table: "users",
            sql: "(must_change_password_at_next_login = TRUE AND password_change_required_until_utc IS NOT NULL) OR (must_change_password_at_next_login = FALSE AND password_change_required_until_utc IS NULL)");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_users_password_change_deadline_consistent",
            table: "users");

        migrationBuilder.DropColumn(
            name: "must_change_password_at_next_login",
            table: "users");

        migrationBuilder.DropColumn(
            name: "password_change_required_until_utc",
            table: "users");
    }
}
