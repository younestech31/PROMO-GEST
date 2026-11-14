using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class ProjectSalesReservationConfiguration : IEntityTypeConfiguration<ProjectSalesReservation>
{
    public void Configure(EntityTypeBuilder<ProjectSalesReservation> builder)
    {
        builder.ToTable("project_sales_reservations", table =>
        {
            table.HasCheckConstraint(
                "ck_project_sales_reservations_status",
                "status IN ('Active', 'Cancelled', 'Expired')");
            table.HasCheckConstraint(
                "ck_project_sales_reservations_expiry",
                "expires_at_utc > reserved_at_utc");
            table.HasCheckConstraint(
                "ck_project_sales_reservations_closure",
                "(status = 'Active' AND closed_at_utc IS NULL AND closed_by_user_id IS NULL AND close_reason IS NULL) OR " +
                "(status = 'Cancelled' AND closed_at_utc IS NOT NULL AND closed_by_user_id IS NOT NULL AND length(btrim(close_reason)) > 0) OR " +
                "(status = 'Expired' AND closed_at_utc IS NOT NULL AND closed_by_user_id IS NULL AND close_reason = 'EXPIRED')");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id").IsRequired();
        builder.Property(x => x.PropertyUnitId).HasColumnName("property_unit_id").IsRequired();
        builder.Property(x => x.ProjectCustomerId).HasColumnName("project_customer_id").IsRequired();
        builder.Property(x => x.ReservationNumber).HasColumnName("reservation_number").HasMaxLength(50).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.ReservedAtUtc).HasColumnName("reserved_at_utc").IsRequired();
        builder.Property(x => x.ExpiresAtUtc).HasColumnName("expires_at_utc").IsRequired();
        builder.Property(x => x.ClosedAtUtc).HasColumnName("closed_at_utc");
        builder.Property(x => x.ClosedByUserId).HasColumnName("closed_by_user_id");
        builder.Property(x => x.CloseReason).HasColumnName("close_reason").HasMaxLength(300);
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.ProjectId, x.ReservationNumber })
            .IsUnique()
            .HasDatabaseName("ux_project_sales_reservations_project_number");
        builder.HasIndex(x => x.PropertyUnitId)
            .IsUnique()
            .HasFilter("status = 'Active'")
            .HasDatabaseName("ux_project_sales_reservations_active_unit");
        builder.HasIndex(x => new { x.ProjectId, x.Status, x.ExpiresAtUtc })
            .HasDatabaseName("ix_project_sales_reservations_project_status_expiry");
        builder.HasIndex(x => x.ProjectCustomerId)
            .HasDatabaseName("ix_project_sales_reservations_customer");
        builder.HasIndex(x => x.CreatedByUserId)
            .HasDatabaseName("ix_project_sales_reservations_created_by");

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<PropertyUnit>()
            .WithMany()
            .HasForeignKey(x => x.PropertyUnitId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<ProjectCustomer>()
            .WithMany()
            .HasForeignKey(x => x.ProjectCustomerId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.ClosedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
