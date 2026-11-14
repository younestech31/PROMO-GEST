namespace PromoGest.Domain.Enums;

public enum CustomerType
{
    Individual = 1,
    LegalEntity = 2
}

public enum ProjectCustomerStatus
{
    Prospect = 1,
    Qualified = 2,
    Customer = 3,
    Archived = 4
}

public enum CustomerSource
{
    WalkIn = 1,
    Phone = 2,
    Referral = 3,
    Website = 4,
    SocialMedia = 5,
    Other = 6
}

public enum CustomerInteractionType
{
    Call = 1,
    Email = 2,
    Meeting = 3,
    Visit = 4,
    Note = 5
}