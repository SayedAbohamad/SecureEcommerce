using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AddressController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public AddressController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> GetAddresses()
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Unauthorized();

            var addresses = await _context.Set<UserAddress>()
                .Where(a => a.UserId == userId)
                .ToListAsync();

            return Ok(addresses);
        }

        [HttpPost]
        public async Task<IActionResult> AddAddress([FromForm] AddressDto model)
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Unauthorized();

            var address = new UserAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Street = model.Street,
                City = model.City,
                State = model.State,
                Country = model.Country,
                ZipCode = model.ZipCode,
                IsDefault = model.IsDefault
            };

            if (address.IsDefault)
            {
                await ClearDefaultAddresses(userId);
                await UpdateUserMainAddress(userId, address);
            }

            _context.UserAddresses.Add(address);
            await _context.SaveChangesAsync();

            return Ok(address);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAddress(Guid id, [FromForm] AddressDto model)
        {
            var userId = _userManager.GetUserId(User);
            var address = await _context.Set<UserAddress>()
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null) return NotFound();

            address.Street = model.Street;
            address.City = model.City;
            address.State = model.State;
            address.Country = model.Country;
            address.ZipCode = model.ZipCode;
            
            if (model.IsDefault && !address.IsDefault)
            {
                await ClearDefaultAddresses(userId!);
            }
            address.IsDefault = model.IsDefault;

            await _context.SaveChangesAsync();
            return Ok(address);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAddress(Guid id)
        {
            var userId = _userManager.GetUserId(User);
            var address = await _context.Set<UserAddress>()
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null) return NotFound();

            _context.Set<UserAddress>().Remove(address);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Address deleted successfully." });
        }

        private async Task ClearDefaultAddresses(string userId)
        {
            var defaults = await _context.UserAddresses
                .Where(a => a.UserId == userId && a.IsDefault)
                .ToListAsync();

            foreach (var d in defaults)
            {
                d.IsDefault = false;
            }
        }

        private async Task UpdateUserMainAddress(string userId, UserAddress address)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user != null)
            {
                user.Address = $"{address.Street}, {address.City}";
                await _userManager.UpdateAsync(user);
            }
        }

        [HttpPost("{id}/set-default")]
        public async Task<IActionResult> SetDefault(Guid id)
        {
            var userId = _userManager.GetUserId(User);
            if (userId == null) return Unauthorized();

            await ClearDefaultAddresses(userId);

            var address = await _context.UserAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null) return NotFound();

            address.IsDefault = true;
            await UpdateUserMainAddress(userId, address);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Default address updated." });
        }
    }

    public class AddressDto
    {
        public string Street { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string? State { get; set; }
        public string? Country { get; set; }
        public string? ZipCode { get; set; }
        public bool IsDefault { get; set; }
    }
}
