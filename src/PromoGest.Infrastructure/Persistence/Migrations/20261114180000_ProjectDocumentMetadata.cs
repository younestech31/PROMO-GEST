using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    public partial class ProjectDocumentMetadata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "category",
                table: "stored_files",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "Other");

            // Use the default only to backfill existing rows; new inserts must provide a category explicitly.
            migrationBuilder.Sql("ALTER TABLE stored_files ALTER COLUMN category DROP DEFAULT;");

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "stored_files",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_stored_files_category",
                table: "stored_files",
                sql: "category IN ('Legal', 'LandAndTitle', 'Permits', 'Plans', 'Engineering', 'Commercial', 'Financial', 'Correspondence', 'Other')");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_stored_files_category",
                table: "stored_files");

            migrationBuilder.DropColumn(
                name: "category",
                table: "stored_files");

            migrationBuilder.DropColumn(
                name: "description",
                table: "stored_files");
        }
    }
}
