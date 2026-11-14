using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class BuildingConfiguration : IEntityTypeConfiguration<Building>
{
    public void Configure(EntityTypeBuilder<Building> builder)
    {
        builder.ToTable("buildings", table =>
        {
            table.HasCheckConstraint("ck_buildings_code_not_empty", "length(btrim(code)) > 0");
            table.HasCheckConstraint("ck_buildings_status", "status IN ('Planned', 'UnderConstruction', 'Completed', 'Suspended')");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id").IsRequired();
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NormalizedCode).HasColumnName("normalized_code").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NameAr).HasColumnName("name_ar").HasMaxLength(200).IsRequired();
        builder.Property(x => x.NameFr).HasColumnName("name_fr").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.ProjectId, x.NormalizedCode })
            .IsUnique()
            .HasDatabaseName("ux_buildings_project_code");
        builder.HasIndex(x => x.CreatedByUserId).HasDatabaseName("ix_buildings_created_by_user_id");

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class BuildingFloorConfiguration : IEntityTypeConfiguration<BuildingFloor>
{
    public void Configure(EntityTypeBuilder<BuildingFloor> builder)
    {
        builder.ToTable("building_floors", table =>
        {
            table.HasCheckConstraint("ck_building_floors_number_range", "floor_number BETWEEN -10 AND 200");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.BuildingId).HasColumnName("building_id").IsRequired();
        builder.Property(x => x.FloorNumber).HasColumnName("floor_number").IsRequired();
        builder.Property(x => x.NameAr).HasColumnName("name_ar").HasMaxLength(100).IsRequired();
        builder.Property(x => x.NameFr).HasColumnName("name_fr").HasMaxLength(100).IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.BuildingId, x.FloorNumber })
            .IsUnique()
            .HasDatabaseName("ux_building_floors_building_number");

        builder.HasOne<Building>()
            .WithMany()
            .HasForeignKey(x => x.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class PropertyUnitConfiguration : IEntityTypeConfiguration<PropertyUnit>
{
    public void Configure(EntityTypeBuilder<PropertyUnit> builder)
    {
        builder.ToTable("property_units", table =>
        {
            table.HasCheckConstraint("ck_property_units_type", "unit_type IN ('Apartment', 'Shop', 'ParkingSpace', 'Office', 'Storage')");
            table.HasCheckConstraint("ck_property_units_status", "status IN ('Planned', 'UnderConstruction', 'AvailableForSale', 'Reserved', 'Sold', 'Delivered', 'Withdrawn')");
            table.HasCheckConstraint("ck_property_units_gross_area_non_negative", "gross_area_square_meters IS NULL OR gross_area_square_meters >= 0");
            table.HasCheckConstraint("ck_property_units_net_area_non_negative", "net_area_square_meters IS NULL OR net_area_square_meters >= 0");
            table.HasCheckConstraint("ck_property_units_net_not_over_gross", "net_area_square_meters IS NULL OR gross_area_square_meters IS NULL OR net_area_square_meters <= gross_area_square_meters");
            table.HasCheckConstraint("ck_property_units_rooms_range", "rooms_count IS NULL OR rooms_count BETWEEN 0 AND 20");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.FloorId).HasColumnName("floor_id").IsRequired();
        builder.Property(x => x.UnitNumber).HasColumnName("unit_number").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NormalizedUnitNumber).HasColumnName("normalized_unit_number").HasMaxLength(40).IsRequired();
        builder.Property(x => x.UnitType).HasColumnName("unit_type").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.GrossAreaSquareMeters).HasColumnName("gross_area_square_meters").HasPrecision(10, 2);
        builder.Property(x => x.NetAreaSquareMeters).HasColumnName("net_area_square_meters").HasPrecision(10, 2);
        builder.Property(x => x.RoomsCount).HasColumnName("rooms_count");
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.FloorId, x.NormalizedUnitNumber })
            .IsUnique()
            .HasDatabaseName("ux_property_units_floor_number");
        builder.HasIndex(x => x.Status).HasDatabaseName("ix_property_units_status");
        builder.HasIndex(x => x.CreatedByUserId).HasDatabaseName("ix_property_units_created_by_user_id");

        builder.HasOne<BuildingFloor>()
            .WithMany()
            .HasForeignKey(x => x.FloorId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
