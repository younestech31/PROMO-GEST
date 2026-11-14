using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PromoGest.Infrastructure.Persistence;

#nullable disable

namespace PromoGest.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261114090000_ProjectStructureFoundation")]
    partial class ProjectStructureFoundation
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            AppDbContextModelSnapshot.BuildModelCore(modelBuilder);
        }
    }
}
