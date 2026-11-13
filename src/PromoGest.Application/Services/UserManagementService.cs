using PromoGest.Application.Interfaces;
using PromoGest.Application.Validators;
using PromoGest.Contracts.Users;
using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using PromoGest.Domain.Interfaces;

namespace PromoGest.Application.Services;

public sealed class UserManagementService
{
    private readonly IUserRepository _userRepository;
    private readonly IInstallationRepository _installationRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuditWriter _auditWriter;
    private readonly IClock _clock;

    public UserManagementService(
        IUserRepository userRepository,
        IInstallationRepository installationRepository,
        IPasswordHasher passwordHasher,
        IAuditWriter auditWriter,
        IClock clock)
    {
        _userRepository = userRepository;
        _installationRepository = installationRepository;
        _passwordHasher = passwordHasher;
        _auditWriter = auditWriter;
        _clock = clock;
    }

    public async Task<IReadOnlyList<RoleDto>> ListRolesAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        await EnsureCanManageUsersAsync(actorUserId, metadata, "ListRoles", ct);
        var roles = await _installationRepository.GetRolesAsync(ct);
        return roles.Select(r => new RoleDto(
            r.Id,
            r.Code,
            r.NameAr,
            r.NameFr,
            r.DescriptionAr,
            r.DescriptionFr,
            r.IsSystemRole)).ToList();
    }

    public async Task<IReadOnlyList<UserDto>> ListUsersAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        await EnsureCanManageUsersAsync(actorUserId, metadata, "ListUsers", ct);
        var users = await _userRepository.ListUsersWithRolesAsync(ct);
        return users.Select(MapUser).ToList();
    }

    public async Task<UserDto> CreateEmployeeAsync(
        Guid actorUserId,
        CreateEmployeeRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageUsersAsync(actorUserId, metadata, "CreateEmployee", ct);
        PasswordPolicyValidator.EnsureValid(request.Password);

        if (request.RoleCodes.Any(rc => string.Equals(rc.Trim(), Role.SystemAdminCode, StringComparison.OrdinalIgnoreCase)))
        {
            await RecordAccessDeniedAsync(actor, "User", null, "Attempted to create a second System Administrator account.", metadata, ct);
            throw new ForbiddenDomainException(
                "SINGLE_SYSTEM_ADMIN_ONLY",
                "Only one System Administrator account may exist per installation.");
        }

        if (request.RoleCodes.Count == 0)
            throw new DomainException("USER_ROLE_REQUIRED", "At least one employee role must be assigned.");

        var exists = await _userRepository.ExistsUsernameOrEmailAsync(request.Username.Trim(), request.Email.Trim(), null, ct);
        if (exists)
            throw new ConflictDomainException("USER_ALREADY_EXISTS", "Username or email is already registered.");

        var roles = await _userRepository.GetRolesByCodesAsync(request.RoleCodes, ct);
        if (roles.Count != request.RoleCodes.Distinct(StringComparer.OrdinalIgnoreCase).Count())
            throw new DomainException("ROLE_NOT_FOUND", "One or more specified roles do not exist.");

        var nowUtc = _clock.UtcNow;
        var passwordHash = _passwordHasher.HashPassword(request.Password);
        var employee = User.CreateEmployee(
            request.Username,
            request.FullName,
            request.Email,
            request.Phone,
            passwordHash,
            request.PreferredLanguage,
            nowUtc);

        await _userRepository.AddUserAsync(employee, ct);
        await _userRepository.ReplaceUserRolesAsync(
            employee.Id,
            roles.Select(r => UserRole.Create(employee.Id, r.Id, actor.Id, nowUtc)),
            ct);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "USER_CREATED",
                AuditSeverity.Security,
                "User",
                employee.Id.ToString(),
                $"Created employee account '{employee.Username}' with roles [{string.Join(", ", roles.Select(r => r.Code))}].",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _userRepository.SaveChangesAsync(ct);

        var reloaded = await _userRepository.GetByIdWithRolesAsync(employee.Id, ct) ?? employee;
        return MapUser(reloaded);
    }

    public async Task<UserDto> UpdateEmployeeAsync(
        Guid actorUserId,
        Guid targetUserId,
        UpdateEmployeeRequest request,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageUsersAsync(actorUserId, metadata, "UpdateEmployee", ct);
        var target = await _userRepository.GetByIdWithRolesAsync(targetUserId, ct)
            ?? throw new NotFoundDomainException("USER_NOT_FOUND", "User account not found.");

        if (target.IsSystemAdministrator)
        {
            if (!actor.IsSystemAdministrator)
            {
                await RecordAccessDeniedAsync(actor, "User", target.Id.ToString(), "Non-admin user attempted to modify the System Administrator account.", metadata, ct);
                throw new ForbiddenDomainException(
                    "CANNOT_MODIFY_SYSTEM_ADMIN",
                    "Only the System Administrator can update their own profile.");
            }

            if (request.RoleCodes.Count != 1 ||
                !string.Equals(request.RoleCodes[0].Trim(), Role.SystemAdminCode, StringComparison.OrdinalIgnoreCase))
            {
                throw new ForbiddenDomainException(
                    "CANNOT_REVOKE_SYSTEM_ADMIN_ROLE",
                    "The System Administrator must retain the SYSTEM_ADMIN role exclusively.");
            }
        }
        else if (request.RoleCodes.Any(rc => string.Equals(rc.Trim(), Role.SystemAdminCode, StringComparison.OrdinalIgnoreCase)))
        {
            await RecordAccessDeniedAsync(actor, "User", target.Id.ToString(), $"Attempted role escalation to SYSTEM_ADMIN for '{target.Username}'.", metadata, ct);
            throw new ForbiddenDomainException(
                "SINGLE_SYSTEM_ADMIN_ONLY",
                "Cannot promote an employee to System Administrator. Only one System Administrator is permitted.");
        }

        var exists = await _userRepository.ExistsUsernameOrEmailAsync(target.Username, request.Email.Trim(), target.Id, ct);
        if (exists)
            throw new ConflictDomainException("USER_EMAIL_CONFLICT", "Email address is already in use by another account.");

        var nowUtc = _clock.UtcNow;
        target.UpdateProfile(request.FullName, request.Email, request.Phone, request.PreferredLanguage, nowUtc);

        if (!target.IsSystemAdministrator)
        {
            if (request.RoleCodes.Count == 0)
                throw new DomainException("USER_ROLE_REQUIRED", "At least one employee role must be assigned.");

            var roles = await _userRepository.GetRolesByCodesAsync(request.RoleCodes, ct);
            if (roles.Count != request.RoleCodes.Distinct(StringComparer.OrdinalIgnoreCase).Count())
                throw new DomainException("ROLE_NOT_FOUND", "One or more specified roles do not exist.");

            await _userRepository.ReplaceUserRolesAsync(
                target.Id,
                roles.Select(r => UserRole.Create(target.Id, r.Id, actor.Id, nowUtc)),
                ct);
        }

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "USER_UPDATED",
                AuditSeverity.Info,
                "User",
                target.Id.ToString(),
                $"Updated account details for '{target.Username}'.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _userRepository.SaveChangesAsync(ct);

        var reloaded = await _userRepository.GetByIdWithRolesAsync(target.Id, ct) ?? target;
        return MapUser(reloaded);
    }

    public async Task<UserDto> SetUserActiveStatusAsync(
        Guid actorUserId,
        Guid targetUserId,
        bool isActive,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageUsersAsync(actorUserId, metadata, "SetUserStatus", ct);
        var target = await _userRepository.GetByIdWithRolesAsync(targetUserId, ct)
            ?? throw new NotFoundDomainException("USER_NOT_FOUND", "User account not found.");

        var nowUtc = _clock.UtcNow;
        target.SetActiveStatus(isActive, nowUtc);
        if (!isActive)
        {
            await _userRepository.RevokeAllUserSessionsAsync(target.Id, nowUtc, ct);
        }

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                AuditSeverity.Security,
                "User",
                target.Id.ToString(),
                $"{(isActive ? "Activated" : "Deactivated")} account '{target.Username}'.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _userRepository.SaveChangesAsync(ct);
        return MapUser(target);
    }

    public async Task ResetEmployeePasswordAsync(
        Guid actorUserId,
        Guid targetUserId,
        string newPassword,
        RequestMetadata metadata,
        CancellationToken ct = default)
    {
        var actor = await EnsureCanManageUsersAsync(actorUserId, metadata, "ResetPassword", ct);
        PasswordPolicyValidator.EnsureValid(newPassword);

        var target = await _userRepository.GetByIdWithRolesAsync(targetUserId, ct)
            ?? throw new NotFoundDomainException("USER_NOT_FOUND", "User account not found.");

        if (target.IsSystemAdministrator && !actor.IsSystemAdministrator)
        {
            await RecordAccessDeniedAsync(actor, "User", target.Id.ToString(), "Non-admin user attempted to reset the System Administrator password.", metadata, ct);
            throw new ForbiddenDomainException(
                "CANNOT_MODIFY_SYSTEM_ADMIN",
                "Only the System Administrator can change their own password via authorized sessions or local server recovery.");
        }

        var nowUtc = _clock.UtcNow;
        target.ResetPassword(_passwordHasher.HashPassword(newPassword), nowUtc);
        await _userRepository.RevokeAllUserSessionsAsync(target.Id, nowUtc, ct);

        await _auditWriter.WriteAsync(
            AuditLog.Record(
                nowUtc,
                actor.Id,
                actor.Username,
                "USER_PASSWORD_RESET",
                AuditSeverity.Security,
                "User",
                target.Id.ToString(),
                $"Password reset and active sessions revoked for '{target.Username}'.",
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);

        await _userRepository.SaveChangesAsync(ct);
    }

    private async Task<User> EnsureCanManageUsersAsync(
        Guid actorUserId,
        RequestMetadata metadata,
        string operation,
        CancellationToken ct)
    {
        var actor = await _userRepository.GetByIdWithRolesAsync(actorUserId, ct)
            ?? throw new UnauthorizedDomainException("AUTH_REQUIRED", "Authentication is required.");

        if (!actor.IsActive)
        {
            await RecordAccessDeniedAsync(actor, "User", null, $"Inactive user '{actor.Username}' attempted '{operation}'.", metadata, ct);
            throw new ForbiddenDomainException("AUTH_ACCOUNT_INACTIVE", "Account is inactive.");
        }

        if (actor.IsSystemAdministrator)
            return actor;

        var permissions = await _userRepository.GetEffectivePermissionsAsync(actorUserId, ct);
        if (!permissions.Contains("users.manage", StringComparer.OrdinalIgnoreCase))
        {
            await RecordAccessDeniedAsync(actor, "User", null, $"Unauthorized user management operation '{operation}' by '{actor.Username}'.", metadata, ct);
            throw new ForbiddenDomainException("FORBIDDEN_USER_MANAGEMENT", "You do not have permission to manage employee accounts.");
        }

        return actor;
    }

    private async Task RecordAccessDeniedAsync(
        User actor,
        string entityType,
        string? entityId,
        string summary,
        RequestMetadata metadata,
        CancellationToken ct)
    {
        await _auditWriter.WriteAsync(
            AuditLog.Record(
                _clock.UtcNow,
                actor.Id,
                actor.Username,
                "ACCESS_DENIED",
                AuditSeverity.Security,
                entityType,
                entityId,
                summary,
                null,
                metadata.IpAddress,
                metadata.UserAgent),
            ct);
        await _userRepository.SaveChangesAsync(ct);
    }

    private static UserDto MapUser(User user)
        => new(
            user.Id,
            user.Username,
            user.FullName,
            user.Email,
            user.Phone,
            user.IsSystemAdministrator,
            user.IsActive,
            user.PreferredLanguage,
            user.FailedLoginAttempts,
            user.LockoutEndUtc,
            user.LastLoginAtUtc,
            user.CreatedAtUtc,
            user.UserRoles.Select(ur => ur.Role.Code).OrderBy(c => c).ToList());
}
