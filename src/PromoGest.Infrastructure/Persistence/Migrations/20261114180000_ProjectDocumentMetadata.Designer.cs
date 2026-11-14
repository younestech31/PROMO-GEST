using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PromoGest.Infrastructure.Persistence;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261114180000_ProjectDocumentMetadata")]
    partial class ProjectDocumentMetadata
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            AppDbContextModelSnapshot.BuildModelCore(modelBuilder);
        }
    }
}
