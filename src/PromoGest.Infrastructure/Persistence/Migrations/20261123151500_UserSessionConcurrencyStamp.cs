using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations;

public partial class UserSessionConcurrencyStamp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "concurrency_stamp",
            table: "user_sessions",
            type: "uuid",
            nullable: true);

        migrationBuilder.Sql("""
            UPDATE user_sessions
            SET concurrency_stamp = gen_random_uuid()
            WHERE concurrency_stamp IS NULL;
            """);

        migrationBuilder.AlterColumn<Guid>(
            name: "concurrency_stamp",
            table: "user_sessions",
            type: "uuid",
            nullable: false,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldNullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "concurrency_stamp",
            table: "user_sessions");
    }
}
