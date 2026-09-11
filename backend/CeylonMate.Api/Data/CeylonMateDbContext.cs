using CeylonMate.Api.Auth;
using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Data;

public sealed class CeylonMateDbContext(DbContextOptions<CeylonMateDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();
        user.ToTable("users");
        user.HasKey(x => x.Id);
        user.HasIndex(x => x.NormalizedEmail).IsUnique();
        user.Property(x => x.Email).HasMaxLength(254).IsRequired();
        user.Property(x => x.NormalizedEmail).HasMaxLength(254).IsRequired();
        user.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        user.Property(x => x.Role).HasConversion<string>().HasMaxLength(32).IsRequired();
    }
}
