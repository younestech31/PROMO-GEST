using System.IO.Compression;
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
        safeFileName = new string(safeFileName.Where(character => !char.IsControl(character)).ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(safeFileName))
            throw new DomainException("FILE_NAME_REQUIRED", "Original file name is required.");
        if (safeFileName.Length > 255)
            throw new DomainException("FILE_NAME_TOO_LONG", "Original file name must not exceed 255 characters.");

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
            // Read a small prefix first so an allowed filename extension cannot disguise another file type.
            var prefix = new byte[12];
            var prefixLength = 0;
            while (prefixLength < prefix.Length)
            {
                var read = await content.ReadAsync(prefix.AsMemory(prefixLength, prefix.Length - prefixLength), ct);
                if (read == 0)
                    break;
                prefixLength += read;
            }

            ValidateFileSignature(extension, prefix.AsSpan(0, prefixLength));

            long totalBytes = prefixLength;
            if (totalBytes > maximumBytes)
                throw new DomainException("FILE_SIZE_LIMIT_EXCEEDED", $"Document size must not exceed {maximumBytes} bytes.");

            string checksum;
            await using (var fs = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            using (var sha256 = IncrementalHash.CreateHash(HashAlgorithmName.SHA256))
            {
                if (prefixLength > 0)
                {
                    await fs.WriteAsync(prefix.AsMemory(0, prefixLength), ct);
                    sha256.AppendData(prefix, 0, prefixLength);
                }

                var buffer = new byte[81920];
                int read;
                while ((read = await content.ReadAsync(buffer.AsMemory(0, buffer.Length), ct)) > 0)
                {
                    totalBytes += read;
                    if (totalBytes > maximumBytes)
                        throw new DomainException("FILE_SIZE_LIMIT_EXCEEDED", $"Document size must not exceed {maximumBytes} bytes.");
                    if ((extension.Equals(".txt", StringComparison.OrdinalIgnoreCase) ||
                         extension.Equals(".csv", StringComparison.OrdinalIgnoreCase)) &&
                        buffer.AsSpan(0, read).Contains((byte)0))
                    {
                        throw new DomainException("FILE_SIGNATURE_INVALID", "Text documents cannot contain binary NUL bytes.");
                    }

                    await fs.WriteAsync(buffer.AsMemory(0, read), ct);
                    sha256.AppendData(buffer, 0, read);
                }

                if (totalBytes == 0)
                    throw new DomainException("FILE_SIZE_INVALID", "Empty documents cannot be stored.");

                await fs.FlushAsync(ct);
                checksum = Convert.ToHexStringLower(sha256.GetHashAndReset());
            }

            ValidateOfficePackage(fullPath, extension);

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

    private static void ValidateFileSignature(string extension, ReadOnlySpan<byte> prefix)
    {
        var normalizedExtension = extension.ToLowerInvariant();
        var valid = normalizedExtension switch
        {
            ".pdf" => prefix.StartsWith("%PDF-"u8),
            ".png" => prefix.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".jpg" or ".jpeg" => prefix.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }),
            ".webp" => prefix.Length >= 12 &&
                       prefix[..4].SequenceEqual("RIFF"u8) &&
                       prefix.Slice(8, 4).SequenceEqual("WEBP"u8),
            ".doc" or ".xls" => prefix.StartsWith(new byte[] { 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1 }),
            ".docx" or ".xlsx" => prefix.StartsWith(new byte[] { 0x50, 0x4B, 0x03, 0x04 }),
            ".txt" or ".csv" => !prefix.Contains((byte)0),
            _ => false
        };

        if (!valid)
            throw new DomainException("FILE_SIGNATURE_INVALID", "The document content does not match its allowed file type.");
    }

    private static void ValidateOfficePackage(string fullPath, string extension)
    {
        if (!extension.Equals(".docx", StringComparison.OrdinalIgnoreCase) &&
            !extension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        try
        {
            using var archive = ZipFile.OpenRead(fullPath);
            var hasContentTypes = archive.GetEntry("[Content_Types].xml") is not null;
            var hasExpectedDocument = extension.Equals(".docx", StringComparison.OrdinalIgnoreCase)
                ? archive.GetEntry("word/document.xml") is not null
                : archive.GetEntry("xl/workbook.xml") is not null;

            if (!hasContentTypes || !hasExpectedDocument)
                throw new DomainException("FILE_SIGNATURE_INVALID", "The Office document package is incomplete or invalid.");
        }
        catch (InvalidDataException)
        {
            throw new DomainException("FILE_SIGNATURE_INVALID", "The Office document package is invalid.");
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
