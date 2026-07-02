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
            h["X-Content-Type-Options"] = "nosniff";

            // Prevent clickjacking (#6 XSS)
            h["X-Frame-Options"] = "DENY";

            // Referrer leakage reduction (#5 misconfiguration)
            h["Referrer-Policy"] = "strict-origin-when-cross-origin";

            // Restrict browser features (#5 misconfiguration)
            h["Permissions-Policy"] =
                "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

            // Content-Security-Policy — restricts resource origins (#6 XSS / #5 misconfiguration).
            // Adjust 'connect-src' and 'img-src' as needed for your CDN / Stripe domains.
            h["Content-Security-Policy"] =
                "default-src 'self'; " +
                "script-src 'self' https://js.stripe.com; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "font-src 'self' https://fonts.gstatic.com; " +
                "connect-src 'self' https://api.stripe.com; " +
                "frame-src https://js.stripe.com; " +
                "object-src 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self';";

            // Prevent information disclosure
            h["X-Powered-By"] = string.Empty; // remove server banner
            h.Remove("Server");

            await next();
        });
    }
}
