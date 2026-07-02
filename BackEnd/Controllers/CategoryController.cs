using BackEnd.DTO.Category;
using BackEnd.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    
    [ApiController]
    public class CategoryController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CategoryController(ApplicationDbContext context)
        {
            _context = context;
        }
         
        
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategory()
        {
            return await _context.categories.Include(p=>p.Products).ToListAsync();
        }
        [HttpGet("{id}")]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategory(Guid id)
        {
           var category =await _context.categories.FirstOrDefaultAsync(c=>c.Id == id);
            if (category == null)
            {
                return NotFound();
            }
            return Ok(category);
        }
        [Authorize(Roles = "Admin,Manager")]
        [HttpPost] 
        public async Task<ActionResult<Category>> CreateCategory([FromForm]CreateCategory category)
        {
            var newcategory = new Category();
            newcategory.Name = category.Name;
            
            _context.categories.Add(newcategory);
            await _context.SaveChangesAsync();  
            return CreatedAtAction(nameof(GetCategory),new {id=newcategory.Id}, newcategory);
        }
        [Authorize(Roles = "Admin,Manager")]
        [HttpPut("{id}")]
        public async Task <IActionResult> UpdateCategory(Guid id, [FromForm] CreateCategory dto)
        {
            var existingCategory = await _context.categories.FindAsync(id);
            if (existingCategory == null)
            {
                return NotFound("Category not found");
            }
            
            // VibeSec: Prevent mass assignment by only updating explicitly allowed fields
            existingCategory.Name = dto.Name;
            
            try
            {
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                return BadRequest("Category not found");
            }
            

        }
        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{id}")]
        public async Task<IActionResult>DeleteCategory(Guid id)
        {
            var category = await _context.categories.FindAsync(id);
            if(category == null)
                return NotFound();

            _context.categories.Remove(category);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
