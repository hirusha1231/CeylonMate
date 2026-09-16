namespace CeylonMate.Api.Trips;

// A durable request for the future workflow worker; this slice does not execute AI work.
public sealed class WorkflowExecution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripRequestId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string Status { get; set; } = "QUEUED";
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
