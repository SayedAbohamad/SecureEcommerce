using AutoMapper;
using BackEnd.DTO.Product;
using BackEnd.Models;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<ProductController> _logger;
        private readonly IProductContentAiService _contentAiService;

        // Allowed image MIME types and extensions (SSRF/LFI fix #12)
        private static readonly HashSet<string> _allowedExtensions = new(StringComparer.OrdinalIgnoreCase)
            { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        private static readonly HashSet<string> _allowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
            { "image/jpeg", "image/png", "image/webp", "image/gif", "application/octet-stream" };
        private const long MaxFileSizeBytes = 5 * 1024 * 1024; // 5 MB

        public ProductController(
            ApplicationDbContext context,
            IMapper mapper,
            IWebHostEnvironment env,
            ILogger<ProductController> logger,
            IProductContentAiService contentAiService)
        {
            _context = context;
            _mapper = mapper;
            _env = env;
            _logger = logger;
            _contentAiService = contentAiService;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Product>>> GetProducts()
        {
            return await _context.products.Include(c => c.Category).ToListAsync();
        }

        [AllowAnonymous]
        [HttpGet("GetProduct2")]
        public async Task<ActionResult<IEnumerable<GetProductDto>>> GetProducts2()
        {
            var products = await _context.products.Include(c => c.Category).ToListAsync();
            return _mapper.Map<List<GetProductDto>>(products);
        }

        [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<ActionResult<GetProductDto>> GetProduct(Guid id)
        {
            var product = await _context.products
                .Include(c => c.Category)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null)
            {
                return NotFound();
            }
            return Ok(_mapper.Map<GetProductDto>(product));
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct([FromForm] CreateProductDto createProductDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // File validation (#12 SSRF/LFI)
            var imageValidation = ValidateImage(createProductDto.Image);
            if (imageValidation != null)
                return imageValidation;

            if (createProductDto.AdditionalImages != null)
            {
                foreach (var img in createProductDto.AdditionalImages)
                {
                    var val = ValidateImage(img);
                    if (val != null) return val;
                }
            }

            try
            {
                var product = _mapper.Map<Product>(createProductDto);
                product.ImageUrl = await SaveImageAsync(createProductDto.Image);

                var additionalPaths = new List<string>();
                if (createProductDto.AdditionalImages != null)
                {
                    foreach (var img in createProductDto.AdditionalImages)
                    {
                        var path = await SaveImageAsync(img);
                        additionalPaths.Add(path);
                    }
                }
                product.AdditionalImages = additionalPaths.Count > 0
                    ? System.Text.Json.JsonSerializer.Serialize(additionalPaths)
                    : null;

                _context.products.Add(product);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Product created: {ProductId} by {User}", product.Id, User.Identity?.Name);
                return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, product);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating product.");
                return StatusCode(500, "An error occurred while creating the product.");
            }
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.products.FindAsync(id);
            if (product == null) return NotFound();

            try
            {
                DeleteImageFile(product.ImageUrl);

                if (!string.IsNullOrEmpty(product.AdditionalImages))
                {
                    try
                    {
                        var paths = System.Text.Json.JsonSerializer.Deserialize<List<string>>(product.AdditionalImages);
                        if (paths != null)
                        {
                            foreach (var path in paths)
                            {
                                DeleteImageFile(path);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to delete additional images on product delete.");
                    }
                }

                _context.products.Remove(product);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Product deleted: {ProductId} by {User}", id, User.Identity?.Name);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting product {ProductId}.", id);
                return StatusCode(500, "An error occurred while deleting the product.");
            }
        }

        [Authorize(Roles = "Admin,Manager")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromForm] UpdateProductDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var product = await _context.products.FindAsync(id);
            if (product == null) return NotFound();

            try
            {
                if (dto.Image != null)
                {
                    // File validation (#12 SSRF/LFI)
                    var imageValidation = ValidateImage(dto.Image);
                    if (imageValidation != null) return imageValidation;

                    var newImageUrl = await SaveImageAsync(dto.Image);
                    DeleteImageFile(product.ImageUrl);
                    product.ImageUrl = newImageUrl;
                }

                if (dto.AdditionalImages != null && dto.AdditionalImages.Count > 0)
                {
                    // Clean up old additional images first
                    if (!string.IsNullOrEmpty(product.AdditionalImages))
                    {
                        try
                        {
                            var oldPaths = System.Text.Json.JsonSerializer.Deserialize<List<string>>(product.AdditionalImages);
                            if (oldPaths != null)
                            {
                                foreach (var path in oldPaths)
                                {
                                    DeleteImageFile(path);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete old additional images during update.");
                        }
                    }

                    var additionalPaths = new List<string>();
                    foreach (var img in dto.AdditionalImages)
                    {
                        var val = ValidateImage(img);
                        if (val != null) return val;

                        var path = await SaveImageAsync(img);
                        additionalPaths.Add(path);
                    }
                    product.AdditionalImages = System.Text.Json.JsonSerializer.Serialize(additionalPaths);
                }

                _mapper.Map(dto, product);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Product updated: {ProductId} by {User}", id, User.Identity?.Name);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating product {ProductId}.", id);
                return StatusCode(500, "An error occurred while updating the product.");
            }
        }

        // ── AI-assisted product content (admin-only, preview-only — never auto-saves) ──
        [Authorize(Roles = "Admin,Manager")]
        [HttpPost("ai/generate-content")]
        [EnableRateLimiting("ai")]
        public async Task<ActionResult<GeneratedProductContentDto>> GenerateProductContent(
            [FromBody] GenerateProductContentRequestDto request,
            CancellationToken cancellationToken)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var generated = await _contentAiService.GenerateAsync(request, cancellationToken);
            _logger.LogInformation(
                "AI product content generated for draft '{Name}' by {User} using provider {Provider}.",
                request.Name,
                User.Identity?.Name,
                generated.Provider);
            return Ok(generated);
        }

        // ── Helpers ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Validates an uploaded image for MIME type, extension, and size.
        /// Returns a BadRequest result on failure, or null if valid.
        /// </summary>
        private BadRequestObjectResult? ValidateImage(IFormFile? image)
        {
            if (image == null || image.Length == 0)
                return BadRequest("Image is required.");

            if (image.Length > MaxFileSizeBytes)
                return BadRequest($"Image size must not exceed {MaxFileSizeBytes / (1024 * 1024)} MB.");

            var extension = Path.GetExtension(image.FileName);
            if (!_allowedExtensions.Contains(extension))
                return BadRequest("Invalid image extension. Allowed: .jpg, .jpeg, .png, .webp, .gif");

            if (!string.IsNullOrWhiteSpace(image.ContentType) && !_allowedMimeTypes.Contains(image.ContentType))
                return BadRequest("Invalid image content type.");

            // VibeSec: Validate Magic Bytes to prevent polyglot/spoofed files
            using var stream = image.OpenReadStream();
            var headerBytes = new byte[12];
            stream.Read(headerBytes, 0, 12);
            
            bool isJpeg = headerBytes[0] == 0xFF && headerBytes[1] == 0xD8 && headerBytes[2] == 0xFF;
            bool isPng = headerBytes[0] == 0x89 && headerBytes[1] == 0x50 && headerBytes[2] == 0x4E && headerBytes[3] == 0x47 && headerBytes[4] == 0x0D && headerBytes[5] == 0x0A && headerBytes[6] == 0x1A && headerBytes[7] == 0x0A;
            bool isGif = headerBytes[0] == 0x47 && headerBytes[1] == 0x49 && headerBytes[2] == 0x46 && headerBytes[3] == 0x38;
            bool isWebp = headerBytes[0] == 0x52 && headerBytes[1] == 0x49 && headerBytes[2] == 0x46 && headerBytes[3] == 0x46 && headerBytes[8] == 0x57 && headerBytes[9] == 0x45 && headerBytes[10] == 0x42 && headerBytes[11] == 0x50; // RIFF...WEBP
            
            if (!isJpeg && !isPng && !isGif && !isWebp)
                return BadRequest("Invalid image file format based on magic bytes.");

            return null;
        }

        private async Task<string> SaveImageAsync(IFormFile image)
        {
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(webRoot, "images", "products");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            // Generate a safe filename using a GUID — no user-supplied name used (#12 LFI)
            var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(image.FileName).ToLowerInvariant()}";

            // Canonicalise and verify the path stays within uploadsFolder (#12 path traversal)
            var filePath = Path.GetFullPath(Path.Combine(uploadsFolder, uniqueFileName));
            if (!filePath.StartsWith(Path.GetFullPath(uploadsFolder), StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("Resolved file path is outside the uploads directory.");

            using var stream = new FileStream(filePath, FileMode.Create);
            await image.CopyToAsync(stream);

            return $"/images/products/{uniqueFileName}";
        }

        private void DeleteImageFile(string? imageUrl)
        {
            if (string.IsNullOrWhiteSpace(imageUrl)) return;

            var relativePath = imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var filePath = Path.GetFullPath(Path.Combine(webRoot, relativePath));

            // Guard against path traversal on delete
            if (!filePath.StartsWith(Path.GetFullPath(webRoot), StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Attempted path traversal on image delete: {Path}", imageUrl);
                return;
            }

            if (System.IO.File.Exists(filePath))
            {
                try { System.IO.File.Delete(filePath); }
                catch (Exception ex) { _logger.LogWarning(ex, "Could not delete image file: {Path}", filePath); }
            }
        }
    }
}
