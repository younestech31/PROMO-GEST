using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PromoGest.Domain.Entities;

namespace PromoGest.Infrastructure.Persistence.Configurations;

public sealed class ProjectCustomerConfiguration : IEntityTypeConfiguration<ProjectCustomer>
{
    public void Configure(EntityTypeBuilder<ProjectCustomer> builder)
    {
        builder.ToTable("project_customers", table =>
        {
            table.HasCheckConstraint("ck_project_customers_name_non_empty", "length(btrim(display_name)) > 0");
            table.HasCheckConstraint("ck_project_customers_phone_normalized", "normalized_phone ~ '^[0-9]{7,15}$'");
            table.HasCheckConstraint("ck_project_customers_type", "customer_type IN ('Individual', 'LegalEntity')");
            table.HasCheckConstraint("ck_project_customers_status", "status IN ('Prospect', 'Qualified', 'Customer', 'Archived')");
            table.HasCheckConstraint("ck_project_customers_source", "source IN ('WalkIn', 'Phone', 'Referral', 'Website', 'SocialMedia', 'Other')");
            table.HasCheckConstraint("ck_project_customers_language", "preferred_language IN ('ar', 'fr')");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectId).HasColumnName("project_id").IsRequired();
        builder.Property(x => x.CustomerType).HasColumnName("customer_type").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.NormalizedDisplayName).HasColumnName("normalized_display_name").HasMaxLength(200).IsRequired();
        builder.Property(x => x.ContactPerson).HasColumnName("contact_person").HasMaxLength(150);
        builder.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(40).IsRequired();
        builder.Property(x => x.NormalizedPhone).HasColumnName("normalized_phone").HasMaxLength(20).IsRequired();
        builder.Property(x => x.Email).HasColumnName("email").HasMaxLength(254);
        builder.Property(x => x.NormalizedEmail).HasColumnName("normalized_email").HasMaxLength(254);
        builder.Property(x => x.Address).HasColumnName("address").HasMaxLength(300);
        builder.Property(x => x.PreferredLanguage).HasColumnName("preferred_language").HasMaxLength(2).IsRequired();
        builder.Property(x => x.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.IdentityDocumentStoredFileId).HasColumnName("identity_document_stored_file_id");
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.Navigation(x => x.Interactions)
            .HasField("_interactions")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(x => new { x.ProjectId, x.NormalizedDisplayName, x.NormalizedPhone })
            .IsUnique()
            .HasDatabaseName("ux_project_customers_project_name_phone");
        builder.HasIndex(x => new { x.ProjectId, x.Status })
            .HasDatabaseName("ix_project_customers_project_status");
        builder.HasIndex(x => x.IdentityDocumentStoredFileId)
            .HasDatabaseName("ix_project_customers_identity_document");

        builder.HasOne<Project>()
            .WithMany()
            .HasForeignKey(x => x.ProjectId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.IdentityDocumentFile)
            .WithMany()
            .HasForeignKey(x => x.IdentityDocumentStoredFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class CustomerInteractionConfiguration : IEntityTypeConfiguration<CustomerInteraction>
{
    public void Configure(EntityTypeBuilder<CustomerInteraction> builder)
    {
        builder.ToTable("customer_interactions", table =>
        {
            table.HasCheckConstraint(
                "ck_customer_interactions_type",
                "interaction_type IN ('Call', 'Email', 'Meeting', 'Visit', 'Note')");
            table.HasCheckConstraint(
                "ck_customer_interactions_follow_up",
                "next_follow_up_at_utc IS NULL OR next_follow_up_at_utc >= occurred_at_utc");
        });

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProjectCustomerId).HasColumnName("project_customer_id").IsRequired();
        builder.Property(x => x.Type).HasColumnName("interaction_type").HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(x => x.Subject).HasColumnName("subject").HasMaxLength(120).IsRequired();
        builder.Property(x => x.Summary).HasColumnName("summary").HasMaxLength(1500).IsRequired();
        builder.Property(x => x.OccurredAtUtc).HasColumnName("occurred_at_utc").IsRequired();
        builder.Property(x => x.NextFollowUpAtUtc).HasColumnName("next_follow_up_at_utc");
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
        builder.Property(x => x.ConcurrencyStamp).HasColumnName("concurrency_stamp").IsConcurrencyToken().IsRequired();

        builder.HasIndex(x => new { x.ProjectCustomerId, x.OccurredAtUtc })
            .HasDatabaseName("ix_customer_interactions_customer_occurred");

        builder.HasOne(x => x.ProjectCustomer)
            .WithMany(customer => customer.Interactions)
            .HasForeignKey(x => x.ProjectCustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CreatedByUser)
            .WithMany()
            .HasForeignKey(x => x.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}