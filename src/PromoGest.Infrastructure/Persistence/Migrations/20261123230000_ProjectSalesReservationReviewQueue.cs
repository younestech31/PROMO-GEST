using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations;

/// <summary>
/// ADR-0018 suspension review queue: two additive, nullable timestamps on the internal hold. They
/// record when a review was requested and when it was completed. No existing row is rewritten, no
/// status column changes, and nothing is cancelled or released by this migration.
/// </summary>
public partial class ProjectSalesReservationReviewQueue : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "review_completed_at_utc",
            table: "project_sales_reservations",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<DateTimeOffset>(
            name: "review_required_at_utc",
            table: "project_sales_reservations",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "ix_project_sales_reservations_review_pending",
            table: "project_sales_reservations",
            columns: new[] { "project_id", "review_required_at_utc" },
            filter: "review_required_at_utc IS NOT NULL AND review_completed_at_utc IS NULL");

        migrationBuilder.AddCheckConstraint(
            name: "ck_project_sales_reservations_review",
            table: "project_sales_reservations",
            sql: "(review_required_at_utc IS NULL AND review_completed_at_utc IS NULL) OR (review_required_at_utc IS NOT NULL AND (review_completed_at_utc IS NULL OR review_completed_at_utc >= review_required_at_utc))");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "ck_project_sales_reservations_review",
            table: "project_sales_reservations");

        migrationBuilder.DropIndex(
            name: "ix_project_sales_reservations_review_pending",
            table: "project_sales_reservations");

        migrationBuilder.DropColumn(
            name: "review_required_at_utc",
            table: "project_sales_reservations");

        migrationBuilder.DropColumn(
            name: "review_completed_at_utc",
            table: "project_sales_reservations");
    }
}
