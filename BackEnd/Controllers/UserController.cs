using BackEnd.DTO.User;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Manager")]
    public class UserController : ControllerBase
    {
        private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
            { "Customer", "Manager", "Admin" };

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ILogger<UserController> _logger;

        public UserController(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ILogger<UserController> logger)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<PaginatedUserResponse>> GetUsers(
            [FromQuery] string? search,
            [FromQuery] string? roleFilter,
            [FromQuery] bool? statusFilter,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var currentUserRoles = await _userManager.GetRolesAsync(currentUser);
            bool isAdmin = currentUserRoles.Contains("Admin");
            bool isManager = currentUserRoles.Contains("Manager");

            var allUsers = _userManager.Users.AsQueryable();

            // Filter based on current user's role
            if (!isAdmin)
            {
                // Manager: exclude Admins
                var adminUsers = await _userManager.GetUsersInRoleAsync("Admin");
                var adminIds = adminUsers.Select(u => u.Id).ToHashSet();
                allUsers = allUsers.Where(u => !adminIds.Contains(u.Id));
            }

            // Apply search
            if (!string.IsNullOrWhiteSpace(search))
            {
                allUsers = allUsers.Where(u =>
                    (u.FullName != null && u.FullName.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (u.Email != null && u.Email.Contains(search, StringComparison.OrdinalIgnoreCase)));
            }

            // Apply role filter
            if (!string.IsNullOrWhiteSpace(roleFilter))
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(roleFilter);
                var roleUserIds = usersInRole.Select(u => u.Id).ToHashSet();
                allUsers = allUsers.Where(u => roleUserIds.Contains(u.Id));
            }

            // Apply status filter based on current lockout state
            if (statusFilter.HasValue)
            {
                var now = DateTimeOffset.UtcNow;
                if (statusFilter.Value)
                {
                    // Locked users
                    allUsers = allUsers.Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value > now);
                }
                else
                {
                    // Active users
                    allUsers = allUsers.Where(u => !u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now);
                }
            }

            // Get total count
            var totalCount = await allUsers.CountAsync();

            // Get paginated users
            var users = await allUsers
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<UserSummaryDto>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                result.Add(new UserSummaryDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    Roles = roles,
                    LockoutEnabled = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow
                });
            }

            var response = new PaginatedUserResponse
            {
                Users = result,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            return Ok(response);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<UserDetailsDto>> GetUserById(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var currentUserRoles = await _userManager.GetRolesAsync(currentUser);
            bool isAdmin = currentUserRoles.Contains("Admin");

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Check permissions
            if (!isAdmin)
            {
                var targetUserRoles = await _userManager.GetRolesAsync(user);
                if (targetUserRoles.Contains("Admin"))
                {
                    return Forbid(); // Manager cannot view Admin details
                }
            }

            var roles = await _userManager.GetRolesAsync(user);

            var dto = new UserDetailsDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Roles = roles,
                EmailConfirmed = user.EmailConfirmed,
                PhoneNumberConfirmed = user.PhoneNumberConfirmed,
                LockoutEnabled = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow,
                AccessFailedCount = user.AccessFailedCount
            };

            return Ok(dto);
        }

        [HttpPut("{id}/roles")]
        public async Task<IActionResult> UpdateUserRoles(string id, [FromBody] UpdateUserRolesDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var currentUserRoles = await _userManager.GetRolesAsync(currentUser);
            bool isAdmin = currentUserRoles.Contains("Admin");

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Check permissions
            var targetUserRoles = await _userManager.GetRolesAsync(user);
            if (!isAdmin && targetUserRoles.Contains("Admin"))
            {
                return Forbid(); // Manager cannot update Admin roles
            }

            var currentRoles = await _userManager.GetRolesAsync(user);
            var rolesToAssign = dto.Roles.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            // Managers cannot assign Admin role
            if (!isAdmin && rolesToAssign.Contains("Admin", StringComparer.OrdinalIgnoreCase))
            {
                return Forbid(); // Manager cannot assign Admin role
            }

            // Privilege escalation fix (#9): only allow known roles
            var invalidRoles = rolesToAssign.Where(r => !AllowedRoles.Contains(r)).ToList();
            if (invalidRoles.Any())
            {
                _logger.LogWarning("Role assignment attempt with unknown roles [{Roles}] by {User}.",
                    string.Join(", ", invalidRoles), User.Identity?.Name);
                return BadRequest($"Invalid roles: {string.Join(", ", invalidRoles)}. Allowed: {string.Join(", ", AllowedRoles)}");
            }

            var rolesToRemove = currentRoles.Where(role => !rolesToAssign.Contains(role, StringComparer.OrdinalIgnoreCase)).ToList();
            var rolesToAdd = rolesToAssign.Where(role => !currentRoles.Contains(role, StringComparer.OrdinalIgnoreCase)).ToList();

            if (rolesToRemove.Any())
            {
                var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
                if (!removeResult.Succeeded)
                    return BadRequest(removeResult.Errors);
            }

            if (rolesToAdd.Any())
            {
                foreach (var role in rolesToAdd)
                    await EnsureRoleExists(role);

                var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
                if (!addResult.Succeeded)
                    return BadRequest(addResult.Errors);
            }

            _logger.LogInformation("Roles for user {UserId} updated by {Updater}: added [{Added}], removed [{Removed}].",
                id, User.Identity?.Name,
                string.Join(", ", rolesToAdd), string.Join(", ", rolesToRemove));

            return NoContent();
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusDto dto)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var currentUserRoles = await _userManager.GetRolesAsync(currentUser);
            bool isAdmin = currentUserRoles.Contains("Admin");

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Check permissions
            var targetUserRoles = await _userManager.GetRolesAsync(user);
            if (!isAdmin && targetUserRoles.Contains("Admin"))
            {
                return Forbid(); // Manager cannot update Admin status
            }

            IdentityResult result;
            if (dto.LockoutEnabled)
            {
                // Ensure lockout capability is active on the user
                user.LockoutEnabled = true;
                result = await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddYears(100));
            }
            else
            {
                result = await _userManager.SetLockoutEndDateAsync(user, null);
            }

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                return BadRequest(updateResult.Errors);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            if (currentUser == null) return Unauthorized();

            var currentUserRoles = await _userManager.GetRolesAsync(currentUser);
            bool isAdmin = currentUserRoles.Contains("Admin");

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            // Check permissions
            var targetUserRoles = await _userManager.GetRolesAsync(user);
            if (!isAdmin && targetUserRoles.Contains("Admin"))
            {
                return Forbid(); // Manager cannot delete Admin
            }

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            return NoContent();
        }

        private async Task EnsureRoleExists(string roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName))
            {
                return;
            }

            if (!await _roleManager.RoleExistsAsync(roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }
    }
}

