using System.Threading.Tasks;
using BackEnd.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BackEnd.Controllers
{
    /// <summary>
    /// Decoy endpoints for common scanner/attacker targets. Anyone hitting these paths is,
    /// by definition, not a legitimate customer or admin — the real admin panel lives at
    /// /admin (SPA route), not any of these. Every visit is logged for the Honeypot Analytics
    /// dashboard, and a harmless fake response is returned so the trap isn't obvious.
    /// </summary>
    [ApiController]
    [AllowAnonymous]
    public sealed class HoneypotController : ControllerBase
    {
        private readonly IHoneypotService _honeypotService;

        public HoneypotController(IHoneypotService honeypotService)
        {
            _honeypotService = honeypotService;
        }

        [AcceptVerbs("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")]
        [Route("admin-old")]
        [Route("admin-old/{**rest}")]
        public Task<IActionResult> AdminOld() => HandleAsync("fake-login");

        [AcceptVerbs("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")]
        [Route("wp-admin")]
        [Route("wp-admin/{**rest}")]
        [Route("wp-login.php")]
        [Route("wp-config.php")]
        public Task<IActionResult> WpAdmin() => HandleAsync("fake-login");

        [AcceptVerbs("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")]
        [Route("phpmyadmin")]
        [Route("phpmyadmin/{**rest}")]
        [Route("pma")]
        public Task<IActionResult> PhpMyAdmin() => HandleAsync("fake-phpmyadmin");

        [AcceptVerbs("GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS")]
        [Route("config")]
        [Route("config/{**rest}")]
        [Route(".env")]
        [Route("config.php")]
        public Task<IActionResult> Config() => HandleAsync("fake-config");

        private async Task<IActionResult> HandleAsync(string trapType)
        {
            await _honeypotService.RecordHitAsync(HttpContext, trapType, HttpContext.RequestAborted);

            return trapType switch
            {
                "fake-login" => Content(FakeWpLoginHtml, "text/html"),
                "fake-phpmyadmin" => Content(FakePhpMyAdminHtml, "text/html"),
                "fake-config" => NotFound(),
                _ => NotFound()
            };
        }

        private const string FakeWpLoginHtml = """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><title>Log In</title></head>
            <body>
              <form method="post" action="#">
                <h1>Log In</h1>
                <label>Username or Email<input type="text" name="log"></label>
                <label>Password<input type="password" name="pwd"></label>
                <button type="submit">Log In</button>
              </form>
            </body>
            </html>
            """;

        private const string FakePhpMyAdminHtml = """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="utf-8"><title>phpMyAdmin</title></head>
            <body>
              <form method="post" action="#">
                <h1>Welcome to phpMyAdmin</h1>
                <label>Username<input type="text" name="pma_username"></label>
                <label>Password<input type="password" name="pma_password"></label>
                <button type="submit">Go</button>
              </form>
            </body>
            </html>
            """;
    }
}
