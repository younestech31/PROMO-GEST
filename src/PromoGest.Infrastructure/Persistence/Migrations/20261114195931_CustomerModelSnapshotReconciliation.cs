using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CustomerModelSnapshotReconciliation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_project_customers_created_by_user_id",
                table: "project_customers",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_customer_interactions_created_by_user_id",
                table: "customer_interactions",
                column: "created_by_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_project_customers_created_by_user_id",
                table: "project_customers");

            migrationBuilder.DropIndex(
                name: "IX_customer_interactions_created_by_user_id",
                table: "customer_interactions");
        }
    }
}
