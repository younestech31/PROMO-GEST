using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class ProjectSalesReservations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_sales_reservations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_unit_id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reservation_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reserved_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    closed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closed_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    close_reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_sales_reservations", x => x.id);
                    table.CheckConstraint(
                        "ck_project_sales_reservations_status",
                        "status IN ('Active', 'Cancelled', 'Expired')");
                    table.CheckConstraint(
                        "ck_project_sales_reservations_expiry",
                        "expires_at_utc > reserved_at_utc");
                    table.CheckConstraint(
                        "ck_project_sales_reservations_closure",
                        "(status = 'Active' AND closed_at_utc IS NULL AND closed_by_user_id IS NULL AND close_reason IS NULL) OR " +
                        "(status = 'Cancelled' AND closed_at_utc IS NOT NULL AND closed_by_user_id IS NOT NULL AND close_reason IS NOT NULL AND length(btrim(close_reason)) > 0) OR " +
                        "(status = 'Expired' AND closed_at_utc IS NOT NULL AND closed_by_user_id IS NULL AND close_reason = 'EXPIRED')");
                    table.ForeignKey(
                        "FK_project_sales_reservations_projects_project_id",
                        x => x.project_id, "projects", "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        "FK_project_sales_reservations_property_units_property_unit_id",
                        x => x.property_unit_id, "property_units", "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        "FK_project_sales_reservations_project_customers_project_customer_id",
                        x => x.project_customer_id, "project_customers", "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        "FK_project_sales_reservations_users_created_by_user_id",
                        x => x.created_by_user_id, "users", "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        "FK_project_sales_reservations_users_closed_by_user_id",
                        x => x.closed_by_user_id, "users", "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ux_project_sales_reservations_project_number",
                table: "project_sales_reservations",
                columns: new[] { "project_id", "reservation_number" },
                unique: true);
            migrationBuilder.CreateIndex(
                name: "ux_project_sales_reservations_active_unit",
                table: "project_sales_reservations",
                column: "property_unit_id",
                unique: true,
                filter: "status = 'Active'");
            migrationBuilder.CreateIndex(
                name: "ix_project_sales_reservations_project_status_expiry",
                table: "project_sales_reservations",
                columns: new[] { "project_id", "status", "expires_at_utc" });
            migrationBuilder.CreateIndex(
                name: "ix_project_sales_reservations_customer",
                table: "project_sales_reservations",
                column: "project_customer_id");
            migrationBuilder.CreateIndex(
                name: "ix_project_sales_reservations_created_by",
                table: "project_sales_reservations",
                column: "created_by_user_id");
            migrationBuilder.CreateIndex(
                name: "ix_project_sales_reservations_closed_by",
                table: "project_sales_reservations",
                column: "closed_by_user_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "project_sales_reservations");
        }
    }
}
