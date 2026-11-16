using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class RetireProjectCustomerIdentityMirrors : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_project_customers_project_name_phone",
                table: "project_customers");

            migrationBuilder.DropCheckConstraint(
                name: "ck_project_customers_name_non_empty",
                table: "project_customers");

            migrationBuilder.DropCheckConstraint(
                name: "ck_project_customers_type",
                table: "project_customers");

            migrationBuilder.DropColumn(
                name: "customer_type",
                table: "project_customers");

            migrationBuilder.DropColumn(
                name: "display_name",
                table: "project_customers");

            migrationBuilder.DropColumn(
                name: "normalized_display_name",
                table: "project_customers");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "customer_type",
                table: "project_customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "display_name",
                table: "project_customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "normalized_display_name",
                table: "project_customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE project_customers AS pc " +
                "SET customer_type = CASE p.party_kind WHEN 'Person' THEN 'Individual' ELSE 'LegalEntity' END, " +
                "display_name = p.display_name, " +
                "normalized_display_name = p.normalized_display_name " +
                "FROM parties AS p " +
                "WHERE p.id = pc.party_id;");

            migrationBuilder.AlterColumn<string>(
                name: "customer_type",
                table: "project_customers",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "display_name",
                table: "project_customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "normalized_display_name",
                table: "project_customers",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_project_customers_name_non_empty",
                table: "project_customers",
                sql: "length(btrim(display_name)) > 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_project_customers_type",
                table: "project_customers",
                sql: "customer_type IN ('Individual', 'LegalEntity')");

            migrationBuilder.CreateIndex(
                name: "ux_project_customers_project_name_phone",
                table: "project_customers",
                columns: new[] { "project_id", "normalized_display_name", "normalized_phone" },
                unique: true);
        }
    }
}
