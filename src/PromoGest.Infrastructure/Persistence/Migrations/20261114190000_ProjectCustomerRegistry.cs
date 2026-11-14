using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class ProjectCustomerRegistry : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "project_customers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_id = table.Column<Guid>(type: "uuid", nullable: false),
                    customer_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    normalized_display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    contact_person = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    phone = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    normalized_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    normalized_email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    address = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    preferred_language = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    source = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    status = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    identity_document_stored_file_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_customers", x => x.id);
                    table.CheckConstraint("ck_project_customers_language", "preferred_language IN ('ar', 'fr')");
                    table.CheckConstraint("ck_project_customers_name_non_empty", "length(btrim(display_name)) > 0");
                    table.CheckConstraint("ck_project_customers_phone_normalized", "normalized_phone ~ '^[0-9]{7,15}$'");
                    table.CheckConstraint("ck_project_customers_source", "source IN ('WalkIn', 'Phone', 'Referral', 'Website', 'SocialMedia', 'Other')");
                    table.CheckConstraint("ck_project_customers_status", "status IN ('Prospect', 'Qualified', 'Customer', 'Archived')");
                    table.CheckConstraint("ck_project_customers_type", "customer_type IN ('Individual', 'LegalEntity')");
                    table.ForeignKey("FK_project_customers_projects_project_id", x => x.project_id, "projects", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_project_customers_stored_files_identity_document_stored_file_id", x => x.identity_document_stored_file_id, "stored_files", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_project_customers_users_created_by_user_id", x => x.created_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "customer_interactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    project_customer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interaction_type = table.Column<string>(type: "character varying(24)", maxLength: 24, nullable: false),
                    subject = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    summary = table.Column<string>(type: "character varying(1500)", maxLength: 1500, nullable: false),
                    occurred_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    next_follow_up_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    concurrency_stamp = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_customer_interactions", x => x.id);
                    table.CheckConstraint("ck_customer_interactions_follow_up", "next_follow_up_at_utc IS NULL OR next_follow_up_at_utc >= occurred_at_utc");
                    table.CheckConstraint("ck_customer_interactions_type", "interaction_type IN ('Call', 'Email', 'Meeting', 'Visit', 'Note')");
                    table.ForeignKey("FK_customer_interactions_project_customers_project_customer_id", x => x.project_customer_id, "project_customers", "id", onDelete: ReferentialAction.Restrict);
                    table.ForeignKey("FK_customer_interactions_users_created_by_user_id", x => x.created_by_user_id, "users", "id", onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex("ix_customer_interactions_customer_occurred", "customer_interactions", new[] { "project_customer_id", "occurred_at_utc" });
            migrationBuilder.CreateIndex("ix_project_customers_identity_document", "project_customers", "identity_document_stored_file_id");
            migrationBuilder.CreateIndex("ix_project_customers_project_status", "project_customers", new[] { "project_id", "status" });
            migrationBuilder.CreateIndex(
                name: "ux_project_customers_project_name_phone",
                table: "project_customers",
                columns: new[] { "project_id", "normalized_display_name", "normalized_phone" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "customer_interactions");
            migrationBuilder.DropTable(name: "project_customers");
        }
    }
}