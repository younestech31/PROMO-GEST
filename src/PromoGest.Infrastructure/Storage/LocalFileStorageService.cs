using System.Security.Cryptography;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Infrastructure.Storage;

public sealed class LocalStorageOptions
{
    public string RootDirectory { get; set; } = "storage";
}

public sealed class LocalFileStorageService
{
    private readonly string _rootDirectory;
    private readonly IClock _clock;

    public LocalFileStorageService(LocalStorageOptions options, IClock clock)
    {
        _rootDirectory = Path.GetFullPath(options.RootDirectory);
        _clock = clock;
        Directory.CreateDirectory(_rootDirectory);
    }

    private string GetSafeFullPath(string relativePath)
    {
        var root = Path.GetFullPath(_rootDirectory);
        if (!root.EndsWith(Path.DirectorySeparatorChar) && !root.EndsWith(Path.AltDirectorySeparatorChar))
        {
            root += Path.DirectorySeparatorChar;
        }

        var fullTarget = Path.GetFullPath(Path.Combine(root, relativePath));
        var relative = Path.GetRelativePath(root, fullTarget);

        if (relative.StartsWith("..", StringComparison.Ordinal) ||
            Path.IsPathRooted(relative) ||
            relative.Equals("..", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Path traversal or root escape blocked.");
        }

        if (!fullTarget.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Path traversal blocked by root prefix boundary.");
        }

        return fullTarget;
    }

    public async Task<StoredFile> SaveAsync(
        Stream content,
        string originalFileName,
        string contentType,
        StoredFileScope scope,
        Guid? projectId,
        Guid uploadedByUserId,
        CancellationToken ct = default)
    {
        var nowUtc = _clock.UtcNow;
        var safeFileName = Path.GetFileName(originalFileName);
        var folder = Path.Combine(
            scope.ToString().ToLowerInvariant(),
            nowUtc.ToString("yyyy"),
            nowUtc.ToString("MM"));
        var targetDirectory = Path.Combine(_rootDirectory, folder);
        Directory.CreateDirectory(targetDirectory);

        var fileId = Guid.NewGuid();
        var extension = Path.GetExtension(safeFileName);
        var storedFileName = $"{fileId:N}{extension}";
        var relativePath = Path.Combine(folder, storedFileName).Replace('\\', '/');
        var fullPath = GetSafeFullPath(relativePath);

        long totalBytes = 0;
        string checksum;

        await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
        using (var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await content.ReadAsync(buffer, ct)) > 0)
            {
                await fs.WriteAsync(buffer.AsMemory(0, read), ct);
                sha256.AppendData(buffer, 0, read);
                totalBytes += read;
            }
            checksum = Convert.ToHexStringLower(sha256.GetHashAndReset());
        }

        return StoredFile.Create(
            safeFileName,
            relativePath,
            contentType,
            totalBytes,
            checksum,
            scope,
            projectId,
            uploadedByUserId,
            nowUtc);
    }

    public string ResolveSafeFullPath(StoredFile storedFile)
    {
        return GetSafeFullPath(storedFile.StoredRelativePath);
    }
}
