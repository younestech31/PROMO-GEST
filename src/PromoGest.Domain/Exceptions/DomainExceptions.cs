namespace PromoGest.Domain.Exceptions;

public class DomainException : Exception
{
    public string Code { get; }

    public DomainException(string code, string message) : base(message)
    {
        Code = code;
    }

    public DomainException(string code, string message, Exception innerException) : base(message, innerException)
    {
        Code = code;
    }
}

// The mutation committed, but the follow-up read used to build its response failed.
public sealed class CommittedWriteResponseException : DomainException
{
    public CommittedWriteResponseException(string code, string message, Exception innerException)
        : base(code, message, innerException) { }
}

public sealed class UnauthorizedDomainException : DomainException
{
    public UnauthorizedDomainException(string code, string message) : base(code, message) { }
}

public sealed class ForbiddenDomainException : DomainException
{
    public ForbiddenDomainException(string code, string message) : base(code, message) { }
}

public sealed class ConflictDomainException : DomainException
{
    public ConflictDomainException(string code, string message) : base(code, message) { }
}

public sealed class NotFoundDomainException : DomainException
{
    public NotFoundDomainException(string code, string message) : base(code, message) { }
}
