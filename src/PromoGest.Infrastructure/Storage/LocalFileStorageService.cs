using System.Security.Cryptography;
using PromoGest.Application.Interfaces;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Infrastructure.Storage;

public sealed class LocalStorageOptions
{
    public string RootDirectory { get; set; } = "storage";
}

public sealed class LocalFileStorageService : IProjectFileStorage
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
        if (string.IsNullOrWhiteSpace(relativePath) || Path.IsPathRooted(relativePath))
            throw new InvalidOperationException("A non-empty relative storage path is required.");

        var root = Path.GetFullPath(_rootDirectory);
        var fullTarget = Path.GetFullPath(Path.Combine(root, relativePath));
        var relative = Path.GetRelativePath(root, fullTarget);
        var escapesRoot =
            relative.Equals("..", StringComparison.Ordinal) ||
            relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal) ||
            relative.StartsWith(".." + Path.AltDirectorySeparatorChar, StringComparison.Ordinal);

        if (escapesRoot || Path.IsPathRooted(relative))
            throw new InvalidOperationException("Path traversal or storage root escape blocked.");

        return fullTarget;
    }

    public async Task<StoredFile> SaveAsync(
        Stream content,
        string originalFileName,
        string contentType,
        string category,
        string? description,
        StoredFileScope scope,
        Guid? projectId,
        Guid uploadedByUserId,
        long maximumBytes,
        CancellationToken ct = default)
    {
        if (maximumBytes <= 0)
            throw new ArgumentOutOfRangeException(nameof(maximumBytes));
        if (content is null || !content.CanRead)
            throw new DomainException("FILE_CONTENT_REQUIRED", "A readable document stream is required.");

        var nowUtc = _clock.UtcNow;
        var safeFileName = Path.GetFileName((originalFileName ?? string.Empty).Trim().Replace('\\', '/'));
        if (string.IsNullOrWhiteSpace(safeFileName))
            throw new DomainException("FILE_NAME_REQUIRED", "Original file name is required.");

        var folder = Path.Combine(
            scope.ToString().ToLowerInvariant(),
            nowUtc.ToString("yyyy"),
            nowUtc.ToString("MM"));
        var targetDirectory = GetSafeFullPath(folder);
        Directory.CreateDirectory(targetDirectory);

        var fileId = Guid.NewGuid();
        var extension = Path.GetExtension(safeFileName);
        var relativePath = Path.Combine(folder, $"{fileId:N}{extension}").Replace('\\', '/');
        var fullPath = GetSafeFullPath(relativePath);

        try
        {
            long totalBytes = 0;
            string checksum;

            await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            using (var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
            {
                var buffer = new byte[81920];
                int read;
                while ((read = await content.ReadAsync(buffer.AsMemory(0, buffer.Length), ct)) > 0)
                {
                    totalBytes += read;
                    if (totalBytes > maximumBytes)
                        throw new DomainException("FILE_SIZE_LIMIT_EXCEEDED", $"Document size must not exceed {maximumBytes} bytes.");

                    await fs.WriteAsync(buffer.AsMemory(0, read), ct);
                    sha256.AppendData(buffer, 0, read);
                }

                if (totalBytes == 0)
                    throw new DomainException("FILE_SIZE_INVALID", "Empty documents cannot be stored.");

                await fs.FlushAsync(ct);
                checksum = Convert.ToHexStringLower(sha256.GetHashAndReset());
            }

            return StoredFile.Create(
                safeFileName,
                relativePath,
                contentType,
                totalBytes,
                checksum,
                category,
                description,
                scope,
                projectId,
                uploadedByUserId,
                nowUtc);
        }
        catch
        {
            TryDeletePath(fullPath);
            throw;
        }
    }

    public string ResolveSafeFullPath(StoredFile storedFile)
        => GetSafeFullPath(storedFile.StoredRelativePath);

    public void Delete(StoredFile storedFile)
        => TryDeletePath(ResolveSafeFullPath(storedFile));

    private static void TryDeletePath(string fullPath)
    {
        try
        {
            if (File.Exists(fullPath))
                File.Delete(fullPath);
        }
        catch (IOException)
        {
            // Preserve the original persistence/validation exception. A later storage audit can
            // identify an orphan if the operating system temporarily prevents cleanup.
        }
        catch (UnauthorizedAccessException)
        {
            // Do not hide the original failure when storage ACLs prevent cleanup.
        }
    }
}
