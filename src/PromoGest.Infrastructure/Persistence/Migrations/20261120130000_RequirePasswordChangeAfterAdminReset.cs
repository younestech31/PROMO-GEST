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
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "must_change_password_at_next_login",
            table: "users");

        migrationBuilder.DropColumn(
            name: "password_change_required_until_utc",
            table: "users");
    }
}
