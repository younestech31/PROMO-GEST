using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class OrganizationWidePartyFoundation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "parties",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    party_kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    normalized_display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parties", x => x.id);
                    table.CheckConstraint("ck_parties_kind", "party_kind IN ('Person', 'LegalEntity')");
                    table.CheckConstraint("ck_parties_name_non_empty", "length(btrim(display_name)) > 0");
                });

            migrationBuilder.AddColumn<Guid>(
                name: "party_id",
                table: "project_customers",
                type: "uuid",
                nullable: true);

            // Deterministic one-to-one initial backfill: preserve each legacy UUID and do not deduplicate by name or phone.
            migrationBuilder.Sql(
                "INSERT INTO parties (id, party_kind, display_name, normalized_display_name, created_at_utc, updated_at_utc, concurrency_stamp) " +
                "SELECT id, CASE customer_type WHEN 'Individual' THEN 'Person' ELSE 'LegalEntity' END, " +
                "display_name, normalized_display_name, created_at_utc, updated_at_utc, gen_random_uuid() " +
                "FROM project_customers;");

            migrationBuilder.Sql("UPDATE project_customers SET party_id = id;");

            migrationBuilder.AlterColumn<Guid>(
                name: "party_id",
                table: "project_customers",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_parties_normalized_display_name",
                table: "parties",
                column: "normalized_display_name");

            migrationBuilder.CreateIndex(
                name: "ix_project_customers_party_id",
                table: "project_customers",
                column: "party_id");

            migrationBuilder.AddForeignKey(
                name: "FK_project_customers_parties_party_id",
                table: "project_customers",
                column: "party_id",
                principalTable: "parties",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DO $$ BEGIN " +
                "IF EXISTS (SELECT 1 FROM parties p LEFT JOIN project_customers pc ON pc.party_id = p.id " +
                "GROUP BY p.id, p.display_name, p.normalized_display_name " +
                "HAVING COUNT(pc.id) <> 1 OR " +
                "MAX(pc.display_name) IS DISTINCT FROM p.display_name OR " +
                "MAX(pc.normalized_display_name) IS DISTINCT FROM p.normalized_display_name OR " +
                "MAX(CASE pc.customer_type WHEN 'Individual' THEN 'Person' ELSE 'LegalEntity' END) IS DISTINCT FROM p.party_kind) " +
                "THEN RAISE EXCEPTION 'Party data has advanced beyond the reversible one-to-one customer compatibility state; reconcile before rollback'; " +
                "END IF; END $$;");

            migrationBuilder.DropForeignKey(
                name: "FK_project_customers_parties_party_id",
                table: "project_customers");

            migrationBuilder.DropIndex(
                name: "ix_project_customers_party_id",
                table: "project_customers");

            migrationBuilder.DropColumn(
                name: "party_id",
                table: "project_customers");

            migrationBuilder.DropTable(name: "parties");
        }
    }
}
