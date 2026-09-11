namespace CeylonMate.Api.Auth;

public sealed class SeedUsersOptions
{
    public const string SectionName = "SeedUsers";
    public bool Enabled { get; init; }

    public string Password { get; init; } = string.Empty;
}
