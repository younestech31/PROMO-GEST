using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PromoGest.Infrastructure.Persistence;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261113000004_AuditLogRuntimePermissions")]
    partial class AuditLogRuntimePermissions
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            AppDbContextModelSnapshot.BuildModelCore(modelBuilder);
        }
    }
}
