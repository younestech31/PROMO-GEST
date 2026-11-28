using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations;

public partial class ClassifyLegacyProjectDocuments : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Unknown historical files may contain identity scans whose links were
        // removed. Restrict all of them until an administrator reviews them.
        migrationBuilder.AddColumn<bool>(name: "is_customer_identity_sensitive", table: "stored_files",
            type: "boolean", nullable: false, defaultValue: true);
        migrationBuilder.AddColumn<bool>(name: "requires_sensitivity_review", table: "stored_files",
            type: "boolean", nullable: false, defaultValue: true);

        // Existing links are known identity documents and remain sensitive even
        // after unlinking. Only the other legacy files require an explicit review.
        migrationBuilder.Sql("""
            UPDATE stored_files AS file
            SET requires_sensitivity_review = FALSE
            WHERE EXISTS (
                SELECT 1 FROM project_customers AS customer
                WHERE customer.identity_document_stored_file_id = file.id
            );
            """);

        // New writes must explicitly persist their classification; do not leave
        // implicit SQL defaults which could make a reviewed/general file ambiguous.
        migrationBuilder.AlterColumn<bool>(name: "is_customer_identity_sensitive", table: "stored_files",
            type: "boolean", nullable: false, oldClrType: typeof(bool), oldType: "boolean", oldDefaultValue: true);
        migrationBuilder.AlterColumn<bool>(name: "requires_sensitivity_review", table: "stored_files",
            type: "boolean", nullable: false, oldClrType: typeof(bool), oldType: "boolean", oldDefaultValue: true);
        migrationBuilder.AddCheckConstraint(name: "ck_stored_files_review_restricted", table: "stored_files",
            sql: "NOT requires_sensitivity_review OR is_customer_identity_sensitive");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Downgrading removes durable sensitivity protection; coordinate this with
        // a protected backup and do not expose downgraded services to users.
        migrationBuilder.DropCheckConstraint(name: "ck_stored_files_review_restricted", table: "stored_files");
        migrationBuilder.DropColumn(name: "requires_sensitivity_review", table: "stored_files");
        migrationBuilder.DropColumn(name: "is_customer_identity_sensitive", table: "stored_files");
    }
}
