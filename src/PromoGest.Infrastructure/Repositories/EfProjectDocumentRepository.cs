using Microsoft.EntityFrameworkCore;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Infrastructure.Persistence;

namespace PromoGest.Infrastructure.Repositories;

public sealed class EfProjectDocumentRepository : IProjectDocumentRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectDocumentRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectDocumentListItem>> ListProjectDocumentsAsync(
        Guid projectId,
        CancellationToken ct = default)
    {
        return await (
            from file in _dbContext.StoredFiles.AsNoTracking()
            join user in _dbContext.Users.AsNoTracking()
                on file.UploadedByUserId equals user.Id
            where file.Scope == StoredFileScope.Project && file.ProjectId == projectId
            orderby file.CreatedAtUtc descending, file.Id
            select new ProjectDocumentListItem(file, user.FullName)
        ).ToListAsync(ct);
    }

    public Task<StoredFile?> GetProjectDocumentAsync(
        Guid projectId,
        Guid fileId,
        CancellationToken ct = default)
        => _dbContext.StoredFiles.FirstOrDefaultAsync(
            file => file.Id == fileId &&
                    file.ProjectId == projectId &&
                    file.Scope == StoredFileScope.Project,
            ct);

    public Task AddAsync(StoredFile file, CancellationToken ct = default)
    {
        _dbContext.StoredFiles.Add(file);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _dbContext.SaveChangesAsync(ct);
}
