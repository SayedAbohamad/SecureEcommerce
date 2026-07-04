namespace BackEnd.Helper;

public static class SecurityHeadersMiddlewareExtensions
{
    /// <summary>
    /// OWASP-aligned HTTP security headers (misconfiguration / XSS / clickjacking baseline).
    /// HSTS is handled by <see cref="Microsoft.AspNetCore.Builder.HstsBuilderExtensions.UseHsts"/>.
    /// </summary>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            var h = context.Response.Headers;

            // Prevent MIME-type sniffing (#6 XSS / #5 misconfiguration)
            h["X-Content-Type-Options"] = SecurityHeaderPolicy.ContentTypeOptions;

            // Prevent clickjacking (#6 XSS)
            h["X-Frame-Options"] = SecurityHeaderPolicy.FrameOptions;

            // Referrer leakage reduction (#5 misconfiguration)
            h["Referrer-Policy"] = SecurityHeaderPolicy.ReferrerPolicy;

            // Restrict browser features (#5 misconfiguration)
            h["Permissions-Policy"] = SecurityHeaderPolicy.PermissionsPolicy;

            // Content-Security-Policy — restricts resource origins (#6 XSS / #5 misconfiguration).
            // Adjust 'connect-src' and 'img-src' as needed for your CDN / Stripe domains.
            h["Content-Security-Policy"] = SecurityHeaderPolicy.ContentSecurityPolicy;

            // Prevent information disclosure
            h["X-Powered-By"] = string.Empty; // remove server banner
            h.Remove("Server");

            await next();
        });
    }
}
