using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class ProjectStructureFoundation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "buildings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    normalized_code = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    name_ar = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    name_fr = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_buildings", x => x.id);
                    table.CheckConstraint("ck_buildings_code_not_empty", "length(btrim(code)) > 0");
                    table.CheckConstraint("ck_buildings_status", "status IN ('Planned', 'UnderConstruction', 'Completed', 'Suspended')");
                    table.ForeignKey(
                        name: "fk_buildings_projects_project_id",
                        column: x => x.project_id,
                        principalTable: "projects",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_buildings_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "building_floors",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    building_id = table.Column<Guid>(type: "uuid", nullable: false),
                    floor_number = table.Column<int>(type: "integer", nullable: false),
                    name_ar = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name_fr = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_building_floors", x => x.id);
                    table.CheckConstraint("ck_building_floors_number_range", "floor_number BETWEEN -10 AND 200");
                    table.ForeignKey(
                        name: "fk_building_floors_buildings_building_id",
                        column: x => x.building_id,
                        principalTable: "buildings",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "property_units",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    floor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    unit_number = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    normalized_unit_number = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    unit_type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    gross_area_square_meters = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    net_area_square_meters = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    rooms_count = table.Column<int>(type: "integer", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_property_units", x => x.id);
                    table.CheckConstraint("ck_property_units_type", "unit_type IN ('Apartment', 'Shop', 'ParkingSpace', 'Office', 'Storage')");
                    table.CheckConstraint("ck_property_units_status", "status IN ('Planned', 'UnderConstruction', 'AvailableForSale', 'Reserved', 'Sold', 'Delivered', 'Withdrawn')");
                    table.CheckConstraint("ck_property_units_gross_area_non_negative", "gross_area_square_meters IS NULL OR gross_area_square_meters >= 0");
                    table.CheckConstraint("ck_property_units_net_area_non_negative", "net_area_square_meters IS NULL OR net_area_square_meters >= 0");
                    table.CheckConstraint("ck_property_units_net_not_over_gross", "net_area_square_meters IS NULL OR gross_area_square_meters IS NULL OR net_area_square_meters <= gross_area_square_meters");
                    table.CheckConstraint("ck_property_units_rooms_range", "rooms_count IS NULL OR rooms_count BETWEEN 0 AND 20");
                    table.ForeignKey(
                        name: "fk_property_units_building_floors_floor_id",
                        column: x => x.floor_id,
                        principalTable: "building_floors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_property_units_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_buildings_created_by_user_id",
                table: "buildings",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_buildings_project_code",
                table: "buildings",
                columns: new[] { "project_id", "normalized_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_building_floors_building_number",
                table: "building_floors",
                columns: new[] { "building_id", "floor_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_property_units_created_by_user_id",
                table: "property_units",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_property_units_floor_number",
                table: "property_units",
                columns: new[] { "floor_id", "normalized_unit_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_property_units_status",
                table: "property_units",
                column: "status");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "property_units");
            migrationBuilder.DropTable(name: "building_floors");
            migrationBuilder.DropTable(name: "buildings");
        }
    }
}
