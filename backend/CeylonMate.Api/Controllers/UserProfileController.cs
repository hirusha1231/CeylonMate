using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CeylonMate.Api.Auth;
using CeylonMate.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CeylonMate.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/users/profile")]
    public class UserProfileController : ControllerBase
    {
        private readonly CeylonMateDbContext _dbContext;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly ILogger<UserProfileController> _logger;

        public UserProfileController(
            CeylonMateDbContext dbContext,
            IPasswordHasher<User> passwordHasher,
            ILogger<UserProfileController> logger)
        {
            _dbContext = dbContext;
            _passwordHasher = passwordHasher;
            _logger = logger;
        }

        // GET /api/users/profile/me
        [HttpGet("me")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing authentication claims." });
            }

            var user = await _dbContext.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            return Ok(new
            {
                id = user.Id,
                email = user.Email,
                fullName = user.FullName ?? string.Empty,
                phoneNumber = user.PhoneNumber ?? string.Empty,
                role = user.Role.ToString()
            });
        }

        // PUT/POST /api/users/profile/update-info & /api/users/profile
        [HttpPut("update-info")]
        [HttpPost("update-info")]
        [HttpPut]
        [HttpPost]
        public async Task<IActionResult> UpdateProfileInfo([FromBody] UpdateProfileInfoDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Invalid payload." });
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid or missing authentication claims." });
            }

            var user = await _dbContext.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName))
            {
                var trimmedName = dto.FullName.Trim();
                if (System.Text.RegularExpressions.Regex.IsMatch(trimmedName, @"\d"))
                {
                    return BadRequest(new { message = "Full Name must contain letters only. Numbers are not allowed." });
                }
                user.FullName = trimmedName;
            }

            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
            {
                var trimmedPhone = dto.PhoneNumber.Trim();
                if (System.Text.RegularExpressions.Regex.IsMatch(trimmedPhone, @"[a-zA-Z]"))
                {
                    return BadRequest(new { message = "Phone Number must contain numbers only. Letters are not allowed." });
                }
                user.PhoneNumber = trimmedPhone;
            }
            else
            {
                user.PhoneNumber = string.Empty;
            }

            // If the user is a guide, keep the GuideProfile name in sync automatically
            if (user.Role == CeylonMate.Api.Auth.UserRole.LOCAL_GUIDE && !string.IsNullOrWhiteSpace(user.FullName))
            {
                var guideProfile = await _dbContext.GuideProfiles.FirstOrDefaultAsync(g => g.UserId == userId);
                if (guideProfile != null)
                {
                    guideProfile.FullName = user.FullName;
                    guideProfile.UpdatedAtUtc = DateTimeOffset.UtcNow;
                }
            }

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Profile updated for user {Email} (ID: {UserId})", user.Email, user.Id);

            return Ok(new
            {
                message = "Profile updated successfully.",
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    fullName = user.FullName,
                    phoneNumber = user.PhoneNumber,
                    role = user.Role.ToString()
                }
            });
        }

        // POST /api/users/profile/change-password
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Current password and new password are required." });
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub")
                ?? User.Identity?.Name;

            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid auth token." });
            }

            var user = await _dbContext.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            // Verify current password using ASP.NET Identity hasher
            var verifyResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword);
            if (verifyResult == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { message = "Current password does not match our records." });
            }

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "New password must be at least 6 characters." });
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("Password changed successfully for user {Email} (ID: {UserId})", user.Email, user.Id);

            return Ok(new { message = "Password updated successfully." });
        }
    }

    public class UpdateProfileInfoDto
    {
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
