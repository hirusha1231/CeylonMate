using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CeylonMate.Api.Auth;

public sealed class DevelopmentUserSeeder(
    CeylonMateDbContext db,
    IPasswordHasher<User> passwordHasher,
    IOptions<SeedUsersOptions> options)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var seedOptions = options.Value;
        if (!seedOptions.Enabled) return;

        foreach (var role in Enum.GetValues<UserRole>())
        {
            var email = $"{role.ToString().ToLowerInvariant()}@local.ceylonmate";
            var normalizedEmail = email.ToUpperInvariant();
            if (await db.Users.AnyAsync(x => x.NormalizedEmail == normalizedEmail, cancellationToken)) continue;

            var user = new User
            {
                Email = email,
                NormalizedEmail = normalizedEmail,
                PasswordHash = string.Empty,
                Role = role
            };
            user.PasswordHash = passwordHasher.HashPassword(user, seedOptions.Password);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
