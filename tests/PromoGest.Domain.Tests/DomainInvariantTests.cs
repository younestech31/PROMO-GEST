using PromoGest.Domain.Entities;
using PromoGest.Domain.Enums;
using PromoGest.Domain.Exceptions;
using Xunit;

namespace PromoGest.Domain.Tests;

public sealed class DomainInvariantTests
{
    private static readonly DateTimeOffset FixedNow = new(2026, 11, 13, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void SystemAdministrator_CannotBeDeactivated_AndCanBeUnlocked()
    {
        var admin = User.CreateSystemAdministrator(
            "sysadmin",
            "Karim Benali",
            "admin@promogest.dz",
            "+213550000001",
            "hash",
            "ar",
            FixedNow);

        var ex = Assert.Throws<DomainException>(() => admin.SetActiveStatus(false, FixedNow.AddMinutes(5)));
        Assert.Equal("CANNOT_DEACTIVATE_SYSTEM_ADMIN", ex.Code);
        Assert.True(admin.IsActive);

        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            admin.RecordFailedLogin(FixedNow.AddSeconds(i));
        }
        Assert.True(admin.IsLockedOut(FixedNow.AddMinutes(1)));
        admin.UnlockAccount(FixedNow.AddMinutes(2));
        Assert.False(admin.IsLockedOut(FixedNow.AddMinutes(2)));
        Assert.Equal(0, admin.FailedLoginAttempts);
    }

    [Fact]
    public void User_RejectsInvalidUsernameOrEmailFormat()
    {
        Assert.Throws<DomainException>(() => User.CreateEmployee("ab", "Short", "a@b.dz", null, "hash", "ar", FixedNow));
        Assert.Throws<DomainException>(() => User.CreateEmployee("bad user!", "Space", "a@b.dz", null, "hash", "ar", FixedNow));
        Assert.Throws<DomainException>(() => User.CreateEmployee("valid.user", "Bad Email", "not-an-email", null, "hash", "ar", FixedNow));
    }

    [Fact]
    public void User_SetPreferredLanguage_ValidatesSupportedLanguagesAndRotatesConcurrencyStamp()
    {
        var user = User.CreateEmployee(
            "language.user",
            "Language User",
            "language.user@promogest.dz",
            null,
            "hash",
            "ar",
            FixedNow);

        var originalStamp = user.ConcurrencyStamp;
        var changedAt = FixedNow.AddMinutes(3);

        user.SetPreferredLanguage("fr", changedAt);

        Assert.Equal("fr", user.PreferredLanguage);
        Assert.NotEqual(originalStamp, user.ConcurrencyStamp);
        Assert.Equal(changedAt, user.UpdatedAtUtc);

        var updatedStamp = user.ConcurrencyStamp;
        var updatedAt = user.UpdatedAtUtc;
        var ex = Assert.Throws<DomainException>(() => user.SetPreferredLanguage("en", changedAt.AddMinutes(1)));

        Assert.Equal("USER_PREFERRED_LANGUAGE_INVALID", ex.Code);
        Assert.Equal("fr", user.PreferredLanguage);
        Assert.Equal(updatedStamp, user.ConcurrencyStamp);
        Assert.Equal(updatedAt, user.UpdatedAtUtc);
    }

    [Fact]
    public void User_LocksOutAfterFiveFailedAttempts_AndRecoversOnSuccess()
    {
        var employee = User.CreateEmployee(
            "sara.commercial",
            "Sara Mansouri",
            "sara@promogest.dz",
            null,
            "hash",
            "fr",
            FixedNow);

        for (var i = 1; i < User.MaxFailedLoginAttempts; i++)
        {
            Assert.False(employee.RecordFailedLogin(FixedNow.AddSeconds(i)));
            Assert.False(employee.IsLockedOut(FixedNow.AddSeconds(i)));
        }

        Assert.True(employee.RecordFailedLogin(FixedNow.AddSeconds(10)));
        Assert.True(employee.IsLockedOut(FixedNow.AddMinutes(5)));
        Assert.False(employee.IsLockedOut(FixedNow.AddMinutes(16)));

        employee.RecordSuccessfulLogin(FixedNow.AddMinutes(20));
        Assert.Equal(0, employee.FailedLoginAttempts);
        Assert.Null(employee.LockoutEndUtc);
    }

    [Fact]
    public void User_ResetsFailedAttemptsAfterLockoutExpiry_AndRequiresFiveNewFailuresToRelock()
    {
        var employee = User.CreateEmployee(
            "amine.lock",
            "Amine Lock",
            "amine.lock@promogest.dz",
            null,
            "hash",
            "fr",
            FixedNow);

        for (var i = 0; i < User.MaxFailedLoginAttempts; i++)
        {
            employee.RecordFailedLogin(FixedNow.AddSeconds(i));
        }
        Assert.True(employee.IsLockedOut(FixedNow.AddMinutes(1)));
        Assert.Equal(User.MaxFailedLoginAttempts, employee.FailedLoginAttempts);

        var afterExpiry = FixedNow.Add(User.LockoutDuration).AddSeconds(5);
        Assert.False(employee.IsLockedOut(afterExpiry));

        // First failure after expiry resets counter to 1 and does not instantly re-lock
        Assert.False(employee.RecordFailedLogin(afterExpiry));
        Assert.Equal(1, employee.FailedLoginAttempts);
        Assert.False(employee.IsLockedOut(afterExpiry.AddSeconds(1)));

        for (var i = 2; i < User.MaxFailedLoginAttempts; i++)
        {
            Assert.False(employee.RecordFailedLogin(afterExpiry.AddSeconds(i)));
        }

        Assert.True(employee.RecordFailedLogin(afterExpiry.AddSeconds(10)));
        Assert.True(employee.IsLockedOut(afterExpiry.AddMinutes(1)));
    }

    [Fact]
    public void OrganizationSettings_EnforcesAlgerianInvariantsAndRejectsInvalidCodes()
    {
        var org = OrganizationSettings.Initialize(
            "SARL Promotion El-Bahdja",
            "El-Bahdja Immo",
            "sarl",
            "001616012345678",
            "001616012345600",
            "16/00-1234567B20",
            "16012345678",
            50_000_000m,
            "16",
            "Alger",
            "Hydra, Alger",
            "+21321000000",
            "contact@elbahdja.dz",
            "ar",
            FixedNow);

        Assert.Equal("DZD", org.CurrencyCode);
        Assert.Equal("SARL", org.LegalForm);
        Assert.Equal(OrganizationSettings.FixedSingletonGuard, org.SingletonGuard);
        Assert.True(org.IsInitialized);

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "SARL", null, null, null, null, null,
            "99", "Unknown", "Address", null, null, "ar", FixedNow));

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "INVALID_FORM", null, null, null, null, null,
            "16", "Alger", "Address", null, null, "ar", FixedNow));

        Assert.Throws<DomainException>(() => OrganizationSettings.Initialize(
            "SARL Test", null, "SARL", "123", null, null, null, null,
            "16", "Alger", "Address", null, null, "ar", FixedNow));

        var wilaya69Organization = OrganizationSettings.Initialize(
            "SARL Test Wilaya 69", null, "SARL", null, null, null, null, null,
            "69", "الأبيض سيدي الشيخ", "Address", null, null, "ar", FixedNow);
        Assert.Equal("69", wilaya69Organization.WilayaCode);
    }

    [Fact]
    public void Project_RejectsNegativeBudgetAndInvalidWilaya_AndAssignsUniqueMembership()
    {
        var creatorId = Guid.NewGuid();
        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-01", "مشروع البهجة", "Résidence El-Bahdja", "16", "Alger", "Hydra",
            null, null, null, null, ProjectStatus.Planning, -100m, 2, 24, creatorId, FixedNow));

        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-02", "مشروع", "Résidence", "00", "Invalid", "Hydra",
            null, null, null, null, ProjectStatus.Planning, 100m, 2, 24, creatorId, FixedNow));

        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-03", "مشروع", "Résidence", "70", "Invalid", "Hydra",
            null, null, null, null, ProjectStatus.Planning, 100m, 2, 24, creatorId, FixedNow));
        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-04", "مشروع", "Résidence", "69", "الأبيض سيدي الشيخ", "الأبيض سيدي الشيخ",
            null, null, null, null, (ProjectStatus)999, 100m, 2, 24, creatorId, FixedNow));
        Assert.Throws<DomainException>(() => Project.Create(
            new string('P', 41), "مشروع", "Résidence", "69", "الأبيض سيدي الشيخ", "الأبيض سيدي الشيخ",
            null, null, null, null, ProjectStatus.Planning, 100m, 2, 24, creatorId, FixedNow));
        Assert.Throws<DomainException>(() => Project.Create(
            "PRJ-05", "مشروع", "Résidence", "69", "الأبيض سيدي الشيخ", "الأبيض سيدي الشيخ",
            null, null, null, null, ProjectStatus.Planning, 9_999_999_999_999_999.99m + 0.01m, 2, 24, creatorId, FixedNow));

        var project = Project.Create(
            "PRJ-01",
            "مشروع البهجة",
            "Résidence El-Bahdja",
            "16",
            "Alger",
            "Hydra",
            null,
            null,
            null,
            null,
            ProjectStatus.Commercialization,
            250_000_000m,
            3,
            48,
            creatorId,
            FixedNow);

        var memberUserId = Guid.NewGuid();
        project.AssignMember(memberUserId, ProjectRole.CommercialAgent, false, true, false, true, creatorId, FixedNow);
        project.AssignMember(memberUserId, ProjectRole.ProjectManager, true, true, true, true, creatorId, FixedNow.AddMinutes(1));

        Assert.Single(project.Members);
        Assert.Equal(ProjectRole.ProjectManager, project.Members.Single().RoleInProject);
        Assert.True(project.Members.Single().CanViewFinancials);

        Assert.Throws<DomainException>(() => ProjectMember.Create(
            Guid.Empty,
            memberUserId,
            ProjectRole.ProjectManager,
            true,
            true,
            true,
            true,
            creatorId,
            FixedNow));
        Assert.Throws<DomainException>(() => ProjectMember.Create(
            project.Id,
            Guid.NewGuid(),
            (ProjectRole)999,
            true,
            true,
            true,
            true,
            creatorId,
            FixedNow));
    }

    [Fact]
    public void Project_ExistingMembershipUpdate_TouchesAggregateRootConcurrencyStamp()
    {
        var creatorId = Guid.NewGuid();
        var project = Project.Create(
            "PRJ-P115-001",
            "مشروع اختبار التزامن",
            "Projet de test de concurrence",
            "16",
            "Alger",
            "Hydra",
            null,
            null,
            null,
            null,
            ProjectStatus.Planning,
            100_000_000m,
            1,
            2,
            creatorId,
            FixedNow);

        var managerId = Guid.NewGuid();
        var membership = project.AssignMember(
            managerId,
            ProjectRole.ProjectManager,
            true,
            true,
            true,
            true,
            creatorId,
            FixedNow);
        var rootStampBefore = project.ConcurrencyStamp;
        var memberStampBefore = membership.ConcurrencyStamp;
        var changedAt = FixedNow.AddMinutes(5);

        project.AssignMember(
            managerId,
            ProjectRole.CommercialAgent,
            false,
            true,
            false,
            true,
            creatorId,
            changedAt);

        Assert.Equal(ProjectRole.CommercialAgent, membership.RoleInProject);
        Assert.NotEqual(memberStampBefore, membership.ConcurrencyStamp);
        Assert.NotEqual(rootStampBefore, project.ConcurrencyStamp);
        Assert.Equal(changedAt, project.UpdatedAtUtc);
    }

    [Fact]
    public void PropertyUnit_EnforcesForwardLifecycleAndWithdrawnTerminalState()
    {
        var unit = PropertyUnit.Create(
            Guid.NewGuid(),
            " a-001 ",
            PropertyUnitType.Apartment,
            PropertyUnitStatus.Planned,
            120m,
            100m,
            4,
            Guid.NewGuid(),
            FixedNow);

        Assert.Equal("A-001", unit.UnitNumber);
        unit.ChangeStatus(PropertyUnitStatus.UnderConstruction, FixedNow.AddDays(1));
        Assert.Equal(PropertyUnitStatus.UnderConstruction, unit.Status);

        unit.ChangeStatus(PropertyUnitStatus.AvailableForSale, FixedNow.AddDays(2));
        Assert.Equal(PropertyUnitStatus.AvailableForSale, unit.Status);

        unit.ChangeStatus(PropertyUnitStatus.Withdrawn, FixedNow.AddDays(3));
        Assert.Equal(PropertyUnitStatus.Withdrawn, unit.Status);

        var invalidReactivation = Assert.Throws<DomainException>(() =>
            unit.ChangeStatus(PropertyUnitStatus.Planned, FixedNow.AddDays(4)));
        Assert.Equal("UNIT_STATUS_TRANSITION_INVALID", invalidReactivation.Code);
    }

    [Fact]
    public void PropertyUnit_RequiresSalesWorkflowForReservedSoldAndDeliveredStates()
    {
        foreach (var protectedStatus in new[]
        {
            PropertyUnitStatus.Reserved,
            PropertyUnitStatus.Sold,
            PropertyUnitStatus.Delivered
        })
        {
            var creation = Assert.Throws<DomainException>(() => PropertyUnit.Create(
                Guid.NewGuid(),
                "A-001",
                PropertyUnitType.Apartment,
                protectedStatus,
                120m,
                100m,
                4,
                Guid.NewGuid(),
                FixedNow));
            Assert.Equal("UNIT_STATUS_REQUIRES_SALES_WORKFLOW", creation.Code);
        }

        var unit = PropertyUnit.Create(
            Guid.NewGuid(),
            "A-002",
            PropertyUnitType.Apartment,
            PropertyUnitStatus.Planned,
            120m,
            100m,
            4,
            Guid.NewGuid(),
            FixedNow);

        var transition = Assert.Throws<DomainException>(() =>
            unit.ChangeStatus(PropertyUnitStatus.Sold, FixedNow.AddDays(1)));
        Assert.Equal("UNIT_STATUS_REQUIRES_SALES_WORKFLOW", transition.Code);
        Assert.Equal(PropertyUnitStatus.Planned, unit.Status);
    }

    [Fact]
    public void PropertyUnit_UpdateDetailsNormalizesNumberAndRejectsInvalidMeasurements()
    {
        var unit = PropertyUnit.Create(
            Guid.NewGuid(),
            "A-001",
            PropertyUnitType.Apartment,
            PropertyUnitStatus.Planned,
            120m,
            100m,
            4,
            Guid.NewGuid(),
            FixedNow);
        var previousConcurrencyStamp = unit.ConcurrencyStamp;

        unit.UpdateDetails(
            " a-002 ",
            PropertyUnitType.Shop,
            80m,
            72.5m,
            null,
            FixedNow.AddMinutes(5));

        Assert.Equal("A-002", unit.UnitNumber);
        Assert.Equal("A-002", unit.NormalizedUnitNumber);
        Assert.Equal(PropertyUnitType.Shop, unit.UnitType);
        Assert.Equal(80m, unit.GrossAreaSquareMeters);
        Assert.Equal(72.5m, unit.NetAreaSquareMeters);
        Assert.Null(unit.RoomsCount);
        Assert.NotEqual(previousConcurrencyStamp, unit.ConcurrencyStamp);
        Assert.Equal(FixedNow.AddMinutes(5), unit.UpdatedAtUtc);

        var invalidUpdate = Assert.Throws<DomainException>(() =>
            unit.UpdateDetails("A-003", PropertyUnitType.Shop, 70m, 75m, 2, FixedNow.AddMinutes(6)));
        Assert.Equal("UNIT_NET_AREA_EXCEEDS_GROSS", invalidUpdate.Code);
        Assert.Equal("A-002", unit.UnitNumber);
    }

    [Fact]
    public void AuditLog_SanitizesControlCharsAndClampsOversizedFields()
    {
        var longUserAgent = new string('A', 450);
        var longSummary = "Line1\r\nLine2 " + new string('B', 600);
        var entry = AuditLog.Record(
            FixedNow,
            null,
            new string('u', 100),
            "AUTH_LOGIN_FAILED",
            AuditSeverity.Security,
            "User",
            "123",
            longSummary,
            null,
            "127.0.0.1",
            longUserAgent);

        Assert.Equal(64, entry.ActorUsername!.Length);
        Assert.Equal(500, entry.Summary.Length);
        Assert.DoesNotContain("\r", entry.Summary);
        Assert.DoesNotContain("\n", entry.Summary);
        Assert.Equal(300, entry.UserAgent!.Length);
    }


    [Fact]
    public void PropertyUnit_ReservationWorkflowReservesAndReleasesOnlyAvailableUnits()
    {
        var unit = PropertyUnit.Create(
            Guid.NewGuid(),
            "A-003",
            PropertyUnitType.Apartment,
            PropertyUnitStatus.AvailableForSale,
            100m,
            90m,
            3,
            Guid.NewGuid(),
            FixedNow);

        var availableStamp = unit.ConcurrencyStamp;
        unit.ReserveForSalesWorkflow(FixedNow.AddMinutes(1));
        Assert.Equal(PropertyUnitStatus.Reserved, unit.Status);
        Assert.NotEqual(availableStamp, unit.ConcurrencyStamp);

        var directTransition = Assert.Throws<DomainException>(() =>
            unit.ChangeStatus(PropertyUnitStatus.AvailableForSale, FixedNow.AddMinutes(2)));
        Assert.Equal("UNIT_STATUS_LOCKED_BY_SALES_WORKFLOW", directTransition.Code);

        unit.ReleaseSalesReservation(FixedNow.AddMinutes(3));
        Assert.Equal(PropertyUnitStatus.AvailableForSale, unit.Status);

        var doubleRelease = Assert.Throws<DomainException>(() =>
            unit.ReleaseSalesReservation(FixedNow.AddMinutes(4)));
        Assert.Equal("UNIT_NOT_RESERVED", doubleRelease.Code);
    }

    [Fact]
    public void ProjectSalesReservation_EnforcesActiveCancellationAndExpiryLifecycle()
    {
        var projectId = Guid.NewGuid();
        var unitId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var actorId = Guid.NewGuid();
        var expiresAt = FixedNow.AddDays(7);
        var reservation = ProjectSalesReservation.Create(
            projectId,
            unitId,
            customerId,
            "RSV-20261114-AB12CD34",
            FixedNow,
            expiresAt,
            actorId,
            FixedNow);

        Assert.Equal(SalesReservationStatus.Active, reservation.Status);
        Assert.Equal(expiresAt, reservation.ExpiresAtUtc);

        var originalStamp = reservation.ConcurrencyStamp;
        reservation.Cancel("Customer requested release", actorId, FixedNow.AddHours(1));
        Assert.Equal(SalesReservationStatus.Cancelled, reservation.Status);
        Assert.Equal("Customer requested release", reservation.CloseReason);
        Assert.NotEqual(originalStamp, reservation.ConcurrencyStamp);

        var repeatCancel = Assert.Throws<DomainException>(() =>
            reservation.Cancel("Repeat", actorId, FixedNow.AddHours(2)));
        Assert.Equal("RESERVATION_NOT_ACTIVE", repeatCancel.Code);

        var expiring = ProjectSalesReservation.Create(
            projectId,
            Guid.NewGuid(),
            customerId,
            "RSV-20261114-BC23DE45",
            FixedNow,
            expiresAt,
            actorId,
            FixedNow);
        var earlyExpiry = Assert.Throws<DomainException>(() => expiring.Expire(FixedNow.AddDays(6)));
        Assert.Equal("RESERVATION_NOT_DUE", earlyExpiry.Code);

        expiring.Expire(expiresAt);
        Assert.Equal(SalesReservationStatus.Expired, expiring.Status);
        Assert.Equal("EXPIRED", expiring.CloseReason);
        Assert.Null(expiring.ClosedByUserId);
    }

    [Fact]
    public void ProjectSalesReservation_RejectsInvalidExpiryAndCancellationReason()
    {
        var invalidExpiry = Assert.Throws<DomainException>(() => ProjectSalesReservation.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "RSV-20261114-AB12CD34",
            FixedNow,
            FixedNow,
            Guid.NewGuid(),
            FixedNow));
        Assert.Equal("RESERVATION_EXPIRY_INVALID", invalidExpiry.Code);

        var reservation = ProjectSalesReservation.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "RSV-20261114-CD34EF56",
            FixedNow,
            FixedNow.AddDays(1),
            Guid.NewGuid(),
            FixedNow);
        var reasonRequired = Assert.Throws<DomainException>(() =>
            reservation.Cancel(" ", Guid.NewGuid(), FixedNow));
        Assert.Equal("RESERVATION_CLOSE_REASON_REQUIRED", reasonRequired.Code);
    }
}
