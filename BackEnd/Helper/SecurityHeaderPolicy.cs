namespace BackEnd.Helper;

public static class SecurityHeaderPolicy
{
    public const string ContentTypeOptions = "nosniff";
    public const string FrameOptions = "DENY";
    public const string ReferrerPolicy = "strict-origin-when-cross-origin";
    public const string PermissionsPolicy = "camera=(), microphone=(), geolocation=(), payment=()";

    public const string ContentSecurityPolicy =
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none'; " +
        "form-action 'self'; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data: https:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com; " +
        "connect-src 'self' http://localhost:5000 https://api.stripe.com https://www.google.com https://www.gstatic.com; " +
        "frame-src https://www.google.com https://js.stripe.com;";
}
