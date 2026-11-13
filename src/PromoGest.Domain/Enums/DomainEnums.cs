namespace PromoGest.Domain.Enums;

public enum ProjectStatus
{
    Planning = 1,
    UnderConstruction = 2,
    Commercialization = 3,
    Delivered = 4,
    Suspended = 5
}

public enum ProjectRole
{
    ProjectManager = 1,
    CommercialAgent = 2,
    FinanceController = 3,
    SiteSupervisor = 4,
    ReadOnlyObserver = 5
}

public enum PropertyUnitType
{
    Apartment = 1,
    Shop = 2,
    ParkingSpace = 3,
    Office = 4,
    Storage = 5
}

public enum AuditSeverity
{
    Info = 1,
    Warning = 2,
    Security = 3
}

public enum StoredFileScope
{
    Organization = 1,
    Project = 2,
    Contract = 3,
    Backup = 4
}
