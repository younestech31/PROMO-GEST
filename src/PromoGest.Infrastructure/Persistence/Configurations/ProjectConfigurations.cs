using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects", table =>
        {
            table.HasCheckConstraint("ck_projects_budget_non_negative", "estimated_budget_dzd >= 0");
            table.HasCheckConstraint("ck_projects_blocks_non_negative", "planned_blocks_count >= 0");
            table.HasCheckConstraint("ck_projects_units_non_negative", "planned_units_count >= 0");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NormalizedCode).HasColumnName("normalized_code").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NameAr).HasColumnName("name_ar").HasMaxLength(200).IsRequired();
        builder.Property(x => x.NameFr).HasColumnName("name_fr").HasMaxLength(200).IsRequired();
        builder.Property(x => x.WilayaCode).HasColumnName("wilaya_code").HasMaxLength(4).IsRequired();
        builder.Property(x => x.WilayaName).HasColumnName("wilaya_name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.Municipality).HasColumnName("municipality").HasMaxLength(120).IsRequired();
        builder.Property(x => x.Address).HasColumnName("address").HasMaxLength(300);
        builder.Property(x => x.LandTitleReference).HasColumnName("land_title_reference").HasMaxLength(120);
        builder.Property(x => x.BuildingPermitNumber).HasColumnName("building_permit_number").HasMaxLength(120);
        builder.Property(x => x.BuildingPermitDate).HasColumnName("building_permit_date");
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(x => x.EstimatedBudgetDzd).HasColumnName("estimated_budget_dzd").HasPrecision(18, 2).IsRequired();
        builder.Property(x => x.PlannedBlocksCount).HasColumnName("planned_blocks_count").IsRequired();
        builder.Property(x => x.PlannedUnitsCount).HasColumnName("planned_units_count").IsRequired();
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => x.NormalizedCode).IsUnique().HasDatabaseName("ux_projects_normalized_code");
        builder.HasIndex(x => x.WilayaCode).HasDatabaseName("ix_projects_wilaya_code");
        builder.HasIndex(x => x.CreatedByUserId).HasDatabaseName("ix_projects_created_by_user_id");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class ProjectMemberConfiguration : IEntityTypeConfiguration<ProjectMember>
{
    public void Configure(EntityTypeBuilder<ProjectMember> builder)
    {
        builder.ToTable("project_members");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id").IsRequired();
        builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(x => x.RoleInProject).HasColumnName("role_in_project").HasConversion<string>().HasMaxLength(40).IsRequired();
        builder.Property(x => x.CanViewFinancials).HasColumnName("can_view_financials").IsRequired();
        builder.Property(x => x.CanManageSales).HasColumnName("can_manage_sales").IsRequired();
        builder.Property(x => x.CanManageConstruction).HasColumnName("can_manage_construction").IsRequired();
        builder.Property(x => x.CanManageDocuments).HasColumnName("can_manage_documents").IsRequired();
        builder.Property(x => x.AssignedByUserId).HasColumnName("assigned_by_user_id").IsRequired();
        builder.Property(x => x.AssignedAtUtc).HasColumnName("assigned_at_utc").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.ProjectId, x.UserId }).IsUnique().HasDatabaseName("ux_project_members_project_user");
        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_project_members_user_id");

        builder.HasOne(x => x.Project)
            .WithMany(p => p.Members)
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(u => u.ProjectMemberships)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
