using System.ComponentModel.DataAnnotations;

namespace CeylonMate.Api.Auth;

public sealed record RegisterRequest(
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 6)] string Password,
    string? FullName = null,
    string? PhoneNumber = null,
    UserRole Role = UserRole.TRAVELER);

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 1)] string Password);

public sealed record UserResponse(Guid Id, string Email, UserRole Role, string? FullName = null);

public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, UserResponse User);
