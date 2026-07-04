# Markety / SecureEcommerce - Project Documentation

آخر مراجعة من الكود الحالي: 2026-07-02

## 1. فكرة المشروع

المشروع عبارة عن منصة تجارة إلكترونية باسم Markety / Mujawharat مبنية كنظام كامل Full Stack:

- Backend باستخدام ASP.NET Core 8 Web API.
- Frontend باستخدام React + TypeScript.
- Database باستخدام SQL Server و Entity Framework Core.
- Authentication و Authorization باستخدام ASP.NET Identity و JWT.
- لوحة Admin لإدارة المنتجات، الأقسام، الطلبات، المستخدمين، أكواد الخصم، والدعم الفني.
- واجهة Customer للتصفح، السلة، الطلبات، الدفع، التقييمات، المفضلة، الإشعارات، والبروفايل.
- ميزات AI اختيارية للـ shopping assistant، التوصيات، تلخيص المراجعات، توليد محتوى المنتجات، دعم العملاء، وتحليلات الإدارة والأمان.

الهدف الأساسي: تقديم Ecommerce آمن وذكي يجمع بين تجربة مستخدم عادية للشراء وتجربة Admin لإدارة المتجر، مع طبقات حماية مثل JWT، roles، rate limiting، reCAPTCHA، security headers، وعدم تخزين مفاتيح حساسة في الكود.

## 2. هيكل المشروع

```text
SecureEcommerce/
  BackEnd/                 ASP.NET Core API + static hosting
  BackEnd.Tests/           xUnit tests للـ backend وميزات AI
  markety-frontend/        React TypeScript frontend
  AI_FEATURES.md           ملخص ميزات AI
  SECRETS_SETUP.md         تعليمات إعداد الأسرار
  PROJECT_DOCUMENTATION_AR.md
```

أهم مسارات الـ Backend:

```text
BackEnd/
  Controllers/             API endpoints
  Models/                  Database entities + settings models
  DTO/                     Data Transfer Objects
  Services/                Business logic, AI, email, recaptcha
  Services/Recommendations Recommendation engine
  Migrations/              EF Core migrations
  Helper/                  AutoMapper + security headers
  wwwroot/                 React production build + assets
```

أهم مسارات الـ Frontend:

```text
markety-frontend/src/
  api/                     Axios API clients
  router/                  App routes
  layouts/                 Customer/Admin layouts
  modules/auth/            Login/Register/Forgot/Reset
  modules/customer/        Storefront pages
  modules/admin/           Admin dashboard pages
  components/common/       Shared UI components
  components/chat/         AI chatbot widget
  contexts/                Auth + Wishlist context
  hooks/                   Reusable React hooks
  types/                   TypeScript data models
  utils/                   constants, currency, media, recaptcha, wishlist
```

## 3. التكنولوجيا المستخدمة

Backend:

- .NET 8 / ASP.NET Core Web API.
- Entity Framework Core 8.
- SQL Server.
- ASP.NET Core Identity.
- JWT Bearer Authentication.
- AutoMapper.
- Stripe.net للدفع.
- MailKit لإرسال الإيميلات.
- Serilog للتسجيل logging.
- Swashbuckle Swagger لتوثيق وتجربة الـ API أثناء التطوير.
- Rate Limiting مدمج في ASP.NET Core.
- Otp.NET موجود كاعتماد متعلق بالـ OTP/TOTP.

Frontend:

- React 19.
- TypeScript.
- React Router 7.
- Axios.
- Bootstrap / React Bootstrap.
- React Hook Form + Yup.
- TanStack React Query.
- React Toastify و SweetAlert2.
- Recharts للرسوم البيانية.
- Three.js / React Three Fiber / Drei لعناصر بصرية.
- Framer Motion و Swiper.

Testing:

- xUnit.
- Microsoft.AspNetCore.Mvc.Testing.
- EF Core InMemory.
- coverlet.collector.

## 4. Architecture عامة

النظام مقسوم إلى طبقتين أساسيتين:

1. Frontend React
   - يعرض صفحات العملاء والإدارة.
   - يتعامل مع الـ API عن طريق Axios clients داخل `src/api`.
   - يخزن JWT في `localStorage` أو `sessionStorage`.
   - يضيف JWT تلقائيا في Header: `Authorization: Bearer <token>`.
   - يضيف Session ID للتوصيات في Header: `X-Markety-Session-Id`.

2. Backend ASP.NET Core
   - يستقبل REST APIs.
   - يطبق Authentication و Authorization بالـ roles.
   - ينفذ الـ business logic داخل Services.
   - يتعامل مع SQL Server عن طريق EF Core.
   - يخدم ملفات React production build من `wwwroot`.

تدفق request مختصر:

```text
React Page
  -> api/*.ts
  -> axiosClient
  -> ASP.NET Controller
  -> Service / DbContext
  -> SQL Server أو AI Provider أو Stripe أو Email
  -> Response DTO
  -> React state/UI
```

## 5. نقطة تشغيل Backend: Program.cs

ملف `BackEnd/Program.cs` هو نقطة البداية، ويعمل الآتي:

- يجهز Serilog للتسجيل في Console وملفات `logs/app-.log`.
- لو `ASPNETCORE_ENVIRONMENT` غير موجود، يجعله `Development` محليا.
- يتحقق أن `Jwt:Key` موجود وطوله على الأقل 32 حرف.
- يسجل Services:
  - `IEmailService`
  - `IRecaptchaService`
  - `IAiShoppingAssistantService`
  - `IGenerativeAiClient`
  - `IReviewSummaryService`
  - `IProductContentAiService`
  - `ISupportTicketAiService`
  - `IAdminInsightsService`
  - `ISecurityInsightsService`
  - recommendation services
- يضبط JSON options لتحويل enum إلى string.
- يضبط Identity password policy:
  - minimum length = 8
  - digit required
  - uppercase/lowercase required
  - non-alphanumeric required
  - lockout بعد 5 محاولات فاشلة لمدة 15 دقيقة
  - unique email required
- يضبط token lifespan للـ password reset/email change إلى 15 دقيقة.
- يضبط Swagger في Development.
- يضبط SQL Server connection.
- يضبط CORS من `AllowedOrigins`.
- يضبط JWT Bearer validation.
- يضبط Rate Limiting:
  - `auth`: 20 request/minute.
  - `ai`: 15 request/minute.
  - global: 300 request/minute لكل IP.
- يضبط HSTS في Production.
- يضبط Stripe secret key لو موجود.
- يشغل `CatalogSeeder.SynchronizeAsync` لو `CatalogSeed:Enabled` مفعلة.
- يستخدم:
  - Security Headers
  - Static Files
  - HTTPS Redirection
  - CORS
  - Rate Limiter
  - Authentication
  - Authorization
  - Controllers

## 6. قاعدة البيانات والموديلات

الـ DbContext هو `ApplicationDbContext` ويرث من `IdentityDbContext<ApplicationUser>`.

الجداول الأساسية:

- `AspNetUsers` من Identity مع توسعة `ApplicationUser`.
- `categories`
- `products`
- `orders`
- `OrderItems`
- `Carts`
- `CartItems`
- `productReviews`
- `Payments`
- `PendingRegistrations`
- `PendingEmailChanges`
- `UserAddresses`
- `Notifications`
- `PromoCodes`
- `SupportTickets`
- `UserBehaviorEvents`
- `UserPreferences`

### ApplicationUser

يمثل المستخدم داخل النظام. بالإضافة لحقول Identity القياسية، يحتوي على:

- `FullName`
- `Address`
- `TotpSecret`
- `DateOfBirth`
- `CreatedAt`
- `LastLogin`
- `NotificationEmail`
- `ReceiveOfferEmails`
- `ReceiveSupportEmails`
- علاقات مع Orders, Addresses, Cart, Reviews, Notifications

الأدوار المستخدمة في المشروع:

- `Admin`
- `Manager`
- `Customer`

### BaseEntity

كلاس مشترك لأغلب الجداول:

- `Id` من نوع Guid.
- `CreatedAt`
- `CreatedBy`
- `UpdatedAt`
- `UpdatedBy`
- `IsDeleted`
- `DeletedAt`
- `IsActive`

### Category

يمثل قسم المنتجات:

- `Name`
- علاقة One-to-Many مع `Product`.

### Product

يمثل المنتج:

- `Name`
- `Description`
- `Price`
- `Slug`
- `Stock`
- `CategoryId`
- `ImageUrl`
- `Sizes` محفوظة كـ JSON string.
- `AdditionalImages` محفوظة كـ JSON string.
- `Reviews`
- `RowVersion` للتعامل مع concurrency.

### Cart و CartItem

السلة مرتبطة بمستخدم:

- `Cart.UserId`
- `Cart.Items`
- `CartItem.ProductId`
- `CartItem.Quantity`
- `CartItem.Size`

### Order و OrderItem و Payment

الطلب يحتوي على:

- `OrderDate`
- `UserId`
- `Items`
- `Payment`
- `TotalAmount`
- `Status`
- `PaymentMethod`
- `PromoCode`
- `DiscountAmount`

حالات الطلب enum:

- `Pending`
- `Processing`
- `Shipped`
- `Delivered`
- `Cancelled`
- `Completed`

الدفع:

- `OrderId`
- `Method`
- `Amount`
- `Status`
- `PaymentDate`

### Review

تقييمات المنتجات:

- `ProductId`
- `UserId`
- `Rating`
- `Comment`
- `IsVerifiedPurchase`

العلاقة:

- Product له Reviews كثيرة.
- User له Reviews كثيرة.
- حذف Product أو User يحذف reviews المرتبطة به Cascade.

### PromoCode

أكواد الخصم تدعم:

- خصم Percentage.
- خصم FixedAmount.
- FreeShipping.
- BuyXGetY.
- minimum order amount.
- max discount.
- usage limits.
- applicable category/product.
- start/expiration date.

### SupportTicket

تذكرة دعم فني:

- `Name`
- `Email`
- `Phone`
- `Subject`
- `Message`
- `Status`
- `AdminReply`
- `RepliedAt`
- `RepliedBy`
- `UserId`

حالات التذكرة:

- `Open`
- `Replied`
- `Closed`

### Notifications

إشعارات المستخدم:

- `Title`
- `Message`
- `Type`: Support, Offer, Order, System
- `IsRead`
- `Link`

### Recommendation Models

`UserBehaviorEvent` يسجل تفاعل المستخدم أو session:

- product/category viewed
- search query
- quantity
- source
- metadata
- occurred time

`UserPreference` يخزن score لكل user/category.

فيه indexes لتحسين البحث حسب:

- User + time.
- Session + time.
- EventType + time.
- Product.
- Category.

## 7. أهم العلاقات في قاعدة البيانات

```text
ApplicationUser 1 -> many Orders
ApplicationUser 1 -> many Reviews
ApplicationUser 1 -> many UserAddresses
ApplicationUser 1 -> 0/1 Cart
ApplicationUser 1 -> many Notifications

Category 1 -> many Products
Product 1 -> many Reviews
Product 1 -> many CartItems
Product 1 -> many OrderItems

Order 1 -> many OrderItems
Order 1 -> 0/1 Payment

UserBehaviorEvent -> optional User/Product/Category
UserPreference -> User + Category unique pair
```

## 8. Backend Controllers والـ APIs

### AuthController - `/api/Auth`

مسؤول عن التسجيل، الدخول، OTP، 2FA، Google login، البروفايل، وتغيير/استرجاع كلمة المرور.

Endpoints:

- `POST /api/Auth/Register`
- `POST /api/Auth/VerifyRegistration`
- `POST /api/Auth/ResendRegistrationOtp`
- `POST /api/Auth/Login`
- `GET /api/Auth/GoogleConfig`
- `POST /api/Auth/Google`
- `POST /api/Auth/Verify2FA`
- `GET /api/Auth/CurrentUser`
- `POST /api/Auth/ToggleTwoFactor` - يحتاج login
- `POST /api/Auth/UpdateProfile` - يحتاج login
- `POST /api/Auth/Resend2FA`
- `POST /api/Auth/SendOTP`
- `POST /api/Auth/RequestPasswordChange` - يحتاج login
- `POST /api/Auth/ConfirmPasswordChange` - يحتاج login
- `POST /api/Auth/ForgotPassword`
- `POST /api/Auth/ResetPassword`

كل controller عليه rate limit باسم `auth`.

### ProductController - `/api/Product`

مسؤول عن المنتجات:

- `GET /api/Product` - public.
- `GET /api/Product/GetProduct2` - public.
- `GET /api/Product/{id}` - public.
- `POST /api/Product` - Admin/Manager.
- `PUT /api/Product/{id}` - Admin/Manager.
- `DELETE /api/Product/{id}` - Admin/Manager.
- `POST /api/Product/ai/generate-content` - Admin/Manager + AI rate limit.

### CategoryController - `/api/Category`

- `GET /api/Category`
- `GET /api/Category/{id}`
- `POST /api/Category` - Admin/Manager.
- `PUT /api/Category/{id}` - Admin/Manager.
- `DELETE /api/Category/{id}` - Admin/Manager.

### CartController - `/api/Cart`

كل العمليات تحتاج login:

- `GET /api/Cart/GetCart`
- `POST /api/Cart`
- `PUT /api/Cart`
- `DELETE /api/Cart/{productId}`

### OrderController - `/api/Order`

عمليات العميل:

- `POST /api/Order/CheckOut`
- `GET /api/Order/{orderId}`
- `PUT /api/Order/{orderId}/cancel`
- `GET /api/Order/mine`
- `POST /api/Order/CreateStripeCheckoutSession`
- `GET /api/Order/VerifyStripeSession/{sessionId}`
- `GET /api/Order/favorite-category`

عمليات الإدارة:

- `GET /api/Order` - Admin/Manager.
- `PUT /api/Order/{orderId}/status` - Admin/Manager.
- `DELETE /api/Order/{orderId}` - Admin/Manager.

### ReviewController - `/api/products/{productId}/reviews`

- `GET /api/products/{productId}/reviews/summary` - public + AI rate limit.
- `POST /api/products/{productId}/reviews/summary/refresh` - Admin/Manager + AI rate limit.
- `GET /api/products/{productId}/reviews`
- `POST /api/products/{productId}/reviews` - يحتاج login.

### RecommendationController - `/api/recommendations`

- `GET /api/recommendations` - يرجع sections توصيات.
- `POST /api/recommendations/track` - يسجل event للتوصيات.

يعتمد على `X-Markety-Session-Id` من frontend لتتبع session حتى لو المستخدم غير مسجل.

### AiAssistantController - `/api/assistant`

- `POST /api/assistant/chat`

يستخدم rate limit `ai`. يقدم shopping assistant مبني على catalog/orders وسياق المستخدم.

### SupportController - `/api/Support`

- `POST /api/Support` - إرسال تذكرة.
- `GET /api/Support` - Admin/Manager.
- `GET /api/Support/mine` - يحتاج login.
- `GET /api/Support/{id}` - Admin/Manager.
- `POST /api/Support/{id}/ai/summarize` - Admin/Manager + AI rate limit.
- `POST /api/Support/{id}/ai/suggest-reply` - Admin/Manager + AI rate limit.
- `POST /api/Support/{id}/ai/classify` - Admin/Manager + AI rate limit.
- `POST /api/Support/{id}/reply` - Admin/Manager.
- `PUT /api/Support/{id}/close` - Admin/Manager.
- `DELETE /api/Support/{id}` - Admin only.

### PromoCodeController - `/api/PromoCode`

- `GET /api/PromoCode` - Admin/Manager.
- `GET /api/PromoCode/{id}` - Admin/Manager.
- `POST /api/PromoCode` - Admin/Manager.
- `PUT /api/PromoCode/{id}` - Admin/Manager.
- `DELETE /api/PromoCode/{id}` - Admin/Manager.
- `GET /api/PromoCode/stats` - Admin/Manager.
- `POST /api/PromoCode/validate` - يحتاج login.
- `GET /api/PromoCode/active` - public.

### UserController - `/api/User`

Admin/Manager:

- `GET /api/User`
- `GET /api/User/{id}`
- `PUT /api/User/{id}/roles`
- `PUT /api/User/{id}/status`
- `DELETE /api/User/{id}`

### AddressController - `/api/Address`

كلها تحتاج login:

- `GET /api/Address`
- `POST /api/Address`
- `PUT /api/Address/{id}`
- `DELETE /api/Address/{id}`
- `POST /api/Address/{id}/set-default`

### NotificationController - `/api/Notification`

كلها تحتاج login:

- `GET /api/Notification`
- `PUT /api/Notification/{id}/read`
- `PUT /api/Notification/read-all`
- `GET /api/Notification/settings`
- `PUT /api/Notification/settings`

### ProfileController - `/api/profile`

يحتاج login:

- `POST /api/profile/email/verify-old`
- `POST /api/profile/email/send-new-otp`
- `POST /api/profile/email/confirm`
- `POST /api/profile/delete-request`
- `POST /api/profile/delete-confirm`

### AdminInsightsController - `/api/admin/insights`

- `GET /api/admin/insights`
- Admin only.
- AI rate limit.

يعطي تحليلات للوحة الإدارة عن المبيعات، الأقسام، المنتجات، المخزون، وأكواد الخصم.

### SecurityInsightsController - `/api/admin/security-insights`

- `GET /api/admin/security-insights`
- Admin only.
- AI rate limit.

يعطي إشارات أمان rule-first مع IDs masked، وليس قرارات حظر تلقائية.

## 9. Frontend Routes

### Customer Routes

داخل `CustomerLayout`:

- `/` الصفحة الرئيسية.
- `/shop` المتجر.
- `/product/:id` تفاصيل المنتج.
- `/cart` السلة.
- `/wishlist` المفضلة.
- `/checkout` إتمام الطلب.
- `/contact` التواصل/الدعم.
- `/orders` طلبات العميل.
- `/orders/:id` تفاصيل طلب.
- `/profile` البروفايل.
- `/profile/notifications` الإشعارات.
- `/settings` الإعدادات.

### Auth Routes

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

### Admin Routes

داخل `AdminLayout` ومحمي بـ `ProtectedRoute`:

- `/admin` Dashboard - Admin/Manager.
- `/admin/categories` - Admin فقط.
- `/admin/products` - Admin فقط.
- `/admin/orders` - Admin/Manager.
- `/admin/users` - Admin/Manager.
- `/admin/support` - Admin/Manager.
- `/admin/promo-codes` - Admin فقط.

## 10. Frontend Data Flow

`src/api/axiosClient.ts` هو client مركزي:

- `baseURL = REACT_APP_API_BASE_URL` أو `/api` افتراضيا.
- يرسل cookies عند الحاجة بـ `withCredentials`.
- يقرأ JWT من localStorage/sessionStorage.
- يضيف `Authorization` header.
- يضيف `X-Markety-Session-Id` للتوصيات.
- لو backend رجع 401 ومعه token مخزن، يطلق event اسمه `markety:auth-unauthorized`.

`src/utils/constants.ts` يحتوي على:

- `AUTH_TOKEN_KEY = markety.auth.token`
- `AUTH_USER_KEY = markety.auth.user`
- `AUTH_UNAUTHORIZED_EVENT`
- `API_BASE_URL`
- `API_ASSET_BASE_URL`

## 11. أهم صفحات العميل

- `HomePage`: الصفحة الرئيسية، hero، أقسام منتجات وتوصيات.
- `ShopPage`: عرض المنتجات والبحث/الفلترة.
- `ProductDetailsPage`: تفاصيل المنتج، صور، مقاسات، تقييمات، ملخص مراجعات AI.
- `CartPage`: إدارة السلة.
- `CheckoutPage`: إنشاء الطلب والدفع/Stripe.
- `OrdersPage`: عرض طلبات المستخدم.
- `OrderDetailsPage`: تفاصيل طلب معين.
- `WishlistPage`: منتجات محفوظة.
- `ProfilePage`: بيانات المستخدم وعناوينه.
- `SettingsPage`: إعدادات الحساب.
- `NotificationsPage`: إشعارات المستخدم.
- `ContactPage`: إنشاء support ticket.

## 12. أهم صفحات الإدارة

- `DashboardPage`: لوحة إحصائيات وتحليلات.
- `CategoriesPage`: إدارة الأقسام.
- `ProductsPage`: إدارة المنتجات وتوليد محتوى AI.
- `OrdersPage`: متابعة وتغيير حالة الطلبات.
- `UsersPage`: إدارة المستخدمين، الأدوار، والحالة.
- `PromoCodesPage`: إدارة كوبونات الخصم.
- `SupportInboxPage`: مراجعة تذاكر الدعم، الرد، وإمكانيات AI.

## 13. Authentication و Authorization

النظام يستخدم:

- ASP.NET Core Identity لإدارة المستخدمين وكلمات المرور والأدوار.
- JWT Bearer tokens لحماية APIs.
- Roles لحماية عمليات الإدارة.
- `ProtectedRoute` في frontend لمنع دخول الصفحات الإدارية بغير الدور المناسب.

سياسة كلمات المرور:

- 8 أحرف على الأقل.
- رقم.
- حرف كبير.
- حرف صغير.
- رمز.
- email فريد.

الحماية من brute force:

- Identity Lockout بعد 5 محاولات فاشلة.
- Rate limit على auth endpoints.

## 14. Security Features

المشروع يحتوي على طبقات أمان مهمة:

- JWT validation:
  - Issuer.
  - Audience.
  - Lifetime.
  - Signing key.
  - clock skew = 1 minute.
- Rate Limiting:
  - auth endpoints.
  - AI endpoints.
  - global rate limit.
- CORS محدد بقائمة AllowedOrigins.
- HSTS في production.
- Security Headers middleware.
- HTTPS redirection.
- عدم وضع API keys في frontend.
- `Jwt:Key` لازم يكون موجود وطوله 32 حرف على الأقل.
- reCAPTCHA service للتحقق من tokens والـ score.
- Serilog request logging.

ملاحظة مهمة للمناقشة: المشروع لا يعتمد على frontend فقط في الحماية. حتى لو المستخدم حاول يفتح endpoint مباشرة، الـ backend عنده `[Authorize]` و roles و JWT validation.

## 15. Payment و Stripe

النظام يدعم Stripe من خلال:

- `POST /api/Order/CreateStripeCheckoutSession`
- `GET /api/Order/VerifyStripeSession/{sessionId}`

الإعدادات:

- `Stripe:SecretKey` في backend.
- `Stripe:FrontendBaseUrl` لتوجيه المستخدم بعد عملية الدفع.

كود Stripe لا يجب أن يوضع في frontend أو `appsettings.json` في production. يتم وضعه في User Secrets أو Environment Variables.

## 16. Email و OTP

خدمة `EmailService` تستخدم MailKit وتدعم:

- إرسال OTP.
- إرسال password reset.
- إرسال delete account OTP.
- رسائل عامة.

الإعدادات في `EmailSettings`:

- host.
- port.
- username.
- password.
- FromName.

## 17. AI Features

المشروع يحتوي على طبقة AI مشتركة:

- `IGenerativeAiClient`
- `GenerativeAiClient`

الفكرة: عزل التعامل مع providers مثل Gemini/OpenAI/Ollama في مكان واحد. Services ترسل system instruction و input منظم وتطلب JSON محدد.

الـ AI Providers:

- Gemini افتراضيا.
- OpenAI مدعوم بتغيير provider/endpoint/model.
- Ollama مدعوم محليا لبعض ميزات الإدارة والدعم.
- deterministic fallback لو API key غير موجود أو provider فشل.

### AI Shopping Assistant

Endpoint:

- `POST /api/assistant/chat`

الوظيفة:

- يساعد العميل في البحث عن المنتجات.
- يرد بناء على catalog وorders.
- يستطيع اقتراح actions مسموحة فقط.
- لا يعتمد على model فقط؛ عند الفشل يرجع fallback منطقي.

### Recommendation Engine

Endpoints:

- `GET /api/recommendations`
- `POST /api/recommendations/track`

يعتمد على:

- user behavior.
- session id.
- product/category interactions.
- popular/trending/frequently bought patterns.
- user preferences scores.

### Review Summary

Endpoints:

- `GET /api/products/{productId}/reviews/summary`
- `POST /api/products/{productId}/reviews/summary/refresh`

الوظيفة:

- تلخيص تعليقات العملاء على منتج.
- استخراج sentiment.
- نقاط إيجابية وسلبية.
- fallback لو AI غير متاح.

### Product Content AI

Endpoint:

- `POST /api/Product/ai/generate-content`

Admin/Manager فقط. يستخدم لتوليد:

- وصف منتج.
- highlights.
- SEO.
- specifications.

المحتوى لا يتم حفظه تلقائيا؛ الأدمن يراجعه ويطبقه.

### Support Ticket AI

Endpoints:

- summarize.
- suggest reply.
- classify.

الوظائف:

- تلخيص التذكرة.
- اقتراح رد قابل للتعديل.
- تصنيف الأولوية/الموضوع.
- لا يرسل الإيميل تلقائيا؛ الأدمن يراجع ويرسل.

### Admin Insights

Endpoint:

- `GET /api/admin/insights`

يعطي تحليلات إدارية عن:

- revenue.
- categories.
- stock.
- promos.
- product performance.

### Security Insights

Endpoint:

- `GET /api/admin/security-insights`

يعتمد على إشارات وقواعد متاحة من النظام:

- payment/order signals.
- promo abuse.
- support signals.
- masked user IDs.

لا يقوم بحظر تلقائي؛ يقدم توصيات للمراجعة البشرية.

## 18. حماية الـ AI من Prompt Injection

الـ AI services مصممة بحيث:

- تعتبر نصوص العملاء/admin input بيانات غير موثوقة.
- تمنع اتباع أوامر مكتوبة داخل review أو ticket أو product description.
- تطلب JSON strict.
- تتحقق من القيم بـ allowlists.
- تحدد أطوال النصوص والقوائم.
- لا تسجل prompts أو raw AI responses في logs.
- تستخدم fallback محلي عند فشل JSON parsing أو provider.

نقطة قوية للمناقشة: "AI is an enhancement, not a single point of failure." يعني لو AI وقع، النظام يستمر.

## 19. Privacy

ما يتم إرساله للـ AI محدود:

- Review summary: تعليقات وتقييمات منتج معين.
- Product content: بيانات المنتج التي يدخلها admin.
- Support AI: موضوع ورسالة تذكرة واحدة.
- Admin insights: أرقام مجمعة.
- Security insights: إشارات وقواعد و IDs masked.

لا يتم إرسال:

- payment cards.
- JWT tokens.
- secrets.
- raw full user tables.
- full customer datasets.

## 20. Configuration

أهم إعدادات `appsettings.json`:

- `AllowedOrigins`
- `ConnectionStrings:DefaultConnection`
- `EmailSettings`
- `Jwt`
- `Stripe`
- `Recaptcha`
- `AiAssistant`

المفاتيح الحساسة يجب وضعها في:

- .NET User Secrets أثناء التطوير.
- Environment Variables في production.

أمثلة:

```powershell
dotnet user-secrets set "Jwt:Key" "a-very-long-secret-key-at-least-32-chars" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "AiAssistant:ApiKey" "YOUR_API_KEY" --project BackEnd/BackEnd.csproj
dotnet user-secrets set "Stripe:SecretKey" "YOUR_STRIPE_SECRET" --project BackEnd/BackEnd.csproj
```

Frontend environment:

```text
REACT_APP_API_BASE_URL=http://localhost:5064/api
```

لو frontend وbackend نفس host، الافتراضي `/api` يكفي.

## 21. طريقة التشغيل محليا

### Backend

من داخل جذر المشروع:

```powershell
dotnet restore BackEnd/BackEnd.csproj
dotnet build BackEnd/BackEnd.csproj
dotnet run --project BackEnd/BackEnd.csproj
```

أو من داخل `BackEnd`:

```powershell
dotnet run
```

يجب التأكد من:

- SQL Server شغال.
- connection string صحيح.
- `Jwt:Key` مضبوط.
- migrations مطبقة على قاعدة البيانات.

### Frontend

```powershell
cd markety-frontend
npm install
npm start
```

لو backend على port مختلف:

```powershell
$env:REACT_APP_API_BASE_URL="http://localhost:5064/api"
npm start
```

### Tests

```powershell
dotnet test BackEnd.Tests/BackEnd.Tests.csproj
```

## 22. Testing الموجود

مشروع `BackEnd.Tests` يحتوي اختبارات لميزات AI والـ authorization:

- `AiServiceTests.cs`
- `AiShoppingAssistantServiceTests.cs`
- `AiEndpointAuthorizationTests.cs`
- `GenerativeAiClientTests.cs`
- `ProductContentAiServiceTests.cs`
- `ReviewSummaryServiceTests.cs`

الاختبارات تستخدم:

- xUnit.
- WebApplicationFactory.
- EF Core InMemory.

الهدف منها التأكد أن:

- AI services ترجع fallback عند الحاجة.
- JSON parsing/provider behavior مضبوط.
- endpoints المحمية ترفض المستخدم غير المصرح له.
- authorization على AI endpoints صحيح.

## 23. سيناريوهات Demo للمناقشة

### Customer Journey

1. افتح الصفحة الرئيسية.
2. اعرض المنتجات والتوصيات.
3. افتح منتج وشوف التفاصيل والتقييمات.
4. أضف منتج للسلة.
5. افتح cart وعدل quantity.
6. نفذ checkout.
7. اعرض orders.
8. جرب support/contact.
9. جرب chatbot واسأله عن منتج أو طلب.

### Admin Journey

1. سجل دخول كـ Admin.
2. افتح dashboard.
3. اعرض insights.
4. أدر المنتجات والأقسام.
5. جرب generate product content.
6. افتح orders وعدل status.
7. افتح users وعدل role/status.
8. افتح promo codes وأنشئ code.
9. افتح support inbox:
   - summarize ticket.
   - classify.
   - suggest reply.
   - عدل الرد وأرسله.
10. افتح security insights واشرح أنها recommendations للمراجعة البشرية.

## 24. نقاط قوة المشروع

- Full stack ecommerce وليس prototype بسيط.
- Authentication و roles واضحة.
- Security layers متعددة.
- Payment integration.
- Email و OTP flows.
- Admin dashboard كاملة.
- Reviews و review summary.
- Recommendation engine.
- AI features متعددة مع fallback.
- Prompt-injection awareness.
- Tests مخصصة للـ AI والـ authorization.
- Same-origin deployment ممكن لأن backend يخدم static frontend.

## 25. نقاط ممكن تتسأل عنها في المناقشة

### لماذا استخدمت JWT؟

لأنه مناسب للـ SPA frontend. بعد login، الـ backend يرسل token، والـ frontend يرسله مع كل request. الـ backend يتحقق من signature وissuer وaudience والصلاحية.

### الفرق بين Authentication و Authorization؟

Authentication يثبت هوية المستخدم. Authorization يحدد ما الذي يستطيع عمله. مثال: customer authenticated لكن لا يستطيع إضافة product لأن endpoint يحتاج Admin/Manager.

### ماذا يحدث لو AI API فشل؟

الخدمات لا تفشل مباشرة. يوجد deterministic fallback يرجع نتيجة محلية، وبذلك لا تتوقف تجربة المستخدم.

### كيف تحمي النظام من prompt injection؟

نصوص المستخدم تعتبر untrusted data. الـ system prompt يمنع تنفيذ أوامر داخل النصوص، والـ output لازم JSON محدد، وبعدها يتم validation وallowlists قبل عرض النتيجة.

### لماذا يوجد rate limiting؟

لتقليل brute force على auth، وحماية AI endpoints من التكلفة أو الاستهلاك الزائد، وحماية باقي النظام globally.

### كيف يتم حماية صفحات الإدارة؟

في frontend يوجد `ProtectedRoute`، لكن الحماية الحقيقية في backend باستخدام `[Authorize(Roles = "...")]`.

### هل يتم إرسال بيانات حساسة للـ AI؟

لا. يتم إرسال أقل قدر من البيانات اللازمة، مثل aggregated metrics أو ticket واحد أو reviews منتج واحد. لا ترسل tokens أو secrets أو payment card data.

### لماذا استخدمت Entity Framework؟

لأنه يوفر ORM قوي، migrations، علاقات بين الجداول، LINQ queries، وتكامل ممتاز مع ASP.NET Identity وSQL Server.

### ما فائدة `RowVersion` في Product؟

تستخدم لمشكلة concurrency: لو أكثر من admin حاول يعدل نفس المنتج في نفس الوقت، النظام يمكنه اكتشاف التعارض بدلا من ضياع تعديل أحدهم.

### لماذا Backend يخدم ملفات frontend من wwwroot؟

هذا يسمح بعمل deployment موحد: نفس ASP.NET app يخدم React build والـ API، والـ frontend يستخدم `/api` بدون مشاكل CORS في production.

## 26. ملاحظات الحالة الحالية

- يوجد تغييرات git غير ملتزم بها قبل إنشاء هذا التوثيق في:
  - `BackEnd/README_AI_ASSISTANT.md`
  - حذف `BackEnd/Services/AiTextGenerationService.cs`
  - حذف `BackEnd/Services/IAiTextGenerationService.cs`
  - تغييرات في chat widget و layouts و shop styles.
- هذا الملف يوثق الحالة الحالية حسب الملفات الموجودة وقت المراجعة.
- بعض الأسرار في `appsettings.json` فارغة عمدا، ويجب ضبطها محليا أو في production.
- AI يمكن أن يعمل بدون API key عن طريق fallback، لكن جودة الردود تتحسن عند ضبط provider key.

## 27. ملخص سريع للحفظ

المشروع Ecommerce آمن وذكي:

- Customer يقدر يسجل، يدخل، يتصفح منتجات، يستخدم wishlist/cart، يعمل checkout، يدفع Stripe، يتابع orders، يكتب reviews، يتواصل مع support، ويستخدم chatbot.
- Admin/Manager يقدر يدير products/categories/orders/users/support/promos، ويستخدم AI للتحليلات والمحتوى والدعم.
- Backend يحمي النظام بـ JWT, Identity, roles, rate limiting, CORS, HSTS, security headers, reCAPTCHA.
- Database مبنية بـ EF Core وتشمل users, products, categories, cart, orders, payments, reviews, notifications, support tickets, promo codes, recommendation events.
- AI ليس إلزاميا: كل ميزة AI لها fallback محلي حتى لا يقع النظام عند فشل provider.

