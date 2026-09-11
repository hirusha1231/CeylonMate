using System.Security.Claims;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace CeylonMate.Api.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    CeylonMateDbContext db,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokens) : ControllerBase
{
    private static readonly HashSet<UserRole> PublicRoles =
    [
        UserRole.TRAVELER,
        UserRole.LOCAL_GUIDE,
        UserRole.TRAVEL_AGENT
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
        if (!PublicRoles.Contains(request.Role))
        {
            ModelState.AddModelError(nameof(request.Role), "This role cannot be self-registered.");
            return ValidationProblem(ModelState);
        }

        var email = request.Email.Trim();
        var normalizedEmail = NormalizeEmail(email);
        if (await db.Users.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken))
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email already registered",
                Status = StatusCodes.Status409Conflict
            });
        }

        var user = new User
        {
            Email = email,
            NormalizedEmail = normalizedEmail,
            PasswordHash = string.Empty,
            Role = request.Role
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (
            exception.InnerException is PostgresException
            {
                SqlState: PostgresErrorCodes.UniqueViolation,
                ConstraintName: "IX_users_NormalizedEmail"
            })
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email already registered",
                Status = StatusCodes.Status409Conflict
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
        var normalizedEmail = NormalizeEmail(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(
            x => x.NormalizedEmail == normalizedEmail,
            cancellationToken);

        if (user is null)
        {
            return UnauthorizedProblem();
        }

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            return UnauthorizedProblem();
        }

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await db.SaveChangesAsync(cancellationToken);
        }

        return Ok(tokens.Create(user));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        return user is null
            ? Unauthorized()
            : Ok(new UserResponse(user.Id, user.Email, user.Role));
    }

    private static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    private ObjectResult UnauthorizedProblem() => Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Invalid email or password");
}
