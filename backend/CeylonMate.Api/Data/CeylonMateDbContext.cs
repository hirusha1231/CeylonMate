using Microsoft.EntityFrameworkCore;

namespace CeylonMate.Api.Data;

public sealed class CeylonMateDbContext(DbContextOptions<CeylonMateDbContext> options)
    : DbContext(options);
