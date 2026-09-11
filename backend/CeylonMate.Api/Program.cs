using CeylonMate.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CeylonMateDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("CeylonMate")));
builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/health");

app.Run();

public partial class Program;
