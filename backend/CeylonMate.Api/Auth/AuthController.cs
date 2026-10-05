using System.Security.Claims;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace CeylonMate.Api.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    CeylonMateDbContext db,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokens,
    ILogger<AuthController> logger) : ControllerBase
{
    private static readonly HashSet<UserRole> PublicRoles =
    [
        UserRole.TRAVELER,
        UserRole.LOCAL_GUIDE,
        UserRole.TRAVEL_AGENT,
        UserRole.CAPACITY_OFFICER,
        UserRole.ADMIN
    ];

    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Registration attempt initiated for Email: {Email}, Role: {Role}, FullName: {FullName}", request.Email, request.Role, request.FullName);

        if (!PublicRoles.Contains(request.Role))
        {
            logger.LogWarning("Registration blocked: Role {Role} cannot self-register", request.Role);
            ModelState.AddModelError(nameof(request.Role), "This role cannot be self-registered.");
            return ValidationProblem(ModelState);
        }

        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            var trimmedName = request.FullName.Trim();
            if (System.Text.RegularExpressions.Regex.IsMatch(trimmedName, @"\d"))
            {
                ModelState.AddModelError(nameof(request.FullName), "Full Name must contain letters only. Numbers are not allowed.");
                return ValidationProblem(ModelState);
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            var trimmedPhone = request.PhoneNumber.Trim();
            if (System.Text.RegularExpressions.Regex.IsMatch(trimmedPhone, @"[a-zA-Z]"))
            {
                ModelState.AddModelError(nameof(request.PhoneNumber), "Phone Number must contain numbers only. Letters are not allowed.");
                return ValidationProblem(ModelState);
            }
        }

        var email = request.Email.Trim();
        var normalizedEmail = NormalizeEmail(email);
        var lowerNormalizedEmail = email.ToLowerInvariant();

        var emailExists = await db.Users.AnyAsync(
            x => x.NormalizedEmail == normalizedEmail || x.Email.ToLower() == lowerNormalizedEmail,
            cancellationToken);

        if (emailExists)
        {
            logger.LogWarning("Registration blocked: Email already exists in database: {Email}", email);
            return Conflict(new
            {
                message = "Email already registered.",
                detail = "This email address is already registered. Please sign in instead."
            });
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            PasswordHash = string.Empty,
            Role = request.Role,
            FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber ?? string.Empty
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        db.Users.Add(user);

        if (user.Role == UserRole.LOCAL_GUIDE)
        {
            var guideProfile = new Models.GuideProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                FullName = user.FullName ?? user.Email,
                PhotoUrl = null,
                LicenseNumber = null,
                Bio = null,
                LanguagesSpoken = null,
                Specialties = null,
                DailyRate = 0m,
                DefaultDailyRateLkr = 0m,
                Rating = 0m,
                ReviewCount = 0,
                Currency = "LKR",
                IsActive = true
            };
            db.GuideProfiles.Add(guideProfile);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Successfully created and saved user {Email} (ID: {UserId}, Role: {Role}) to database.", email, user.Id, user.Role);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation
            })
        {
            logger.LogWarning(exception, "PostgreSQL unique constraint violation for email: {Email}", email);
            return Conflict(new
            {
                message = "Email already registered.",
                detail = "This email address is already registered. Please sign in instead."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "EF Core SaveChangesAsync Exception for user {Email}: {Message}", email, ex.InnerException?.Message ?? ex.Message);
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = $"Server database error: {ex.InnerException?.Message ?? ex.Message}",
                detail = ex.InnerException?.Message ?? ex.Message
            });
        }

        return StatusCode(StatusCodes.Status201Created, tokens.Create(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Login attempt for email: {Email}", request.Email);
        var normalizedEmail = NormalizeEmail(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(
            x => x.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (user is null)
        {
            logger.LogWarning("Login failed: User not found for email {Email}", request.Email);
            return UnauthorizedProblem();
        }

        if (!user.IsActive)
        {
            logger.LogWarning("Login blocked: Account is suspended for email {Email}", request.Email);
            return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
            {
                Title = "Account Suspended",
                Detail = "Account is suspended. Please contact CeylonMate Admin.",
                Status = StatusCodes.Status403Forbidden
            });
        }

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            logger.LogWarning("Login failed: Password mismatch for email {Email}", request.Email);
            return UnauthorizedProblem();
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await db.SaveChangesAsync(cancellationToken);
        }

        logger.LogInformation("Successful login for user {Email} with role {Role}", user.Email, user.Role);
        return Ok(tokens.Create(user));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub")
            ?? User.FindFirstValue("id")
            ?? User.FindFirstValue("nameid");

        User? user = null;
        if (!string.IsNullOrWhiteSpace(userIdStr) && Guid.TryParse(userIdStr, out var userId))
        {
            user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        }

        if (user is null)
        {
            var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
            if (!string.IsNullOrWhiteSpace(email))
            {
                var norm = NormalizeEmail(email);
                user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.NormalizedEmail == norm || x.Email == email, cancellationToken);
            }
        }

        return user is null
            ? Unauthorized()
            : Ok(new UserResponse(user.Id, user.Email, user.Role, user.FullName));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    private ObjectResult UnauthorizedProblem() => Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Invalid email or password");
}
