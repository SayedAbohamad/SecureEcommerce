# Mujawharat Frontend

React + TypeScript admin/customer portal styled with the Electro Bootstrap 1.0.0 template.  
Backed by the ASP.NET Core API in `BackEnd/BackEnd`.

## Prerequisites

- Node 18+
- .NET SDK 8.0+
- SQL Server instance with the `JewelleryEcommerce` database (configured in `appsettings.json`)

## Running Locally

### API

1. `cd BackEnd/BackEnd`
2. `dotnet ef database update`
3. `dotnet run`

The API listens on `https://localhost:5001` and enables CORS for `http(s)://localhost:3000`.

### Frontend

1. `cd FrontEnd/mujawharat-frontend`
2. Copy `.env.example` → `.env` (or edit the existing `.env`) and confirm `REACT_APP_API_BASE_URL=https://localhost:5001/api`
3. `npm install`
4. `npm start`

`npm run build` produces a production bundle in `build/`.

## Key Modules

- `src/modules/customer` – public site (home, catalogue, cart, checkout, order history)
- `src/modules/admin` – protected dashboard for admins/managers (stats, categories, products, orders, customers)
- `src/api` – Axios clients for Auth, Categories, Products, Orders, Customers, Cart.  
  Automatically attaches JWT from localStorage.
- `src/contexts/AuthContext.tsx` – handles login/registration, token storage, role checks.

## Backend Highlights

| Area | Endpoint | Notes |
| --- | --- | --- |
| Auth | `POST /api/Auth/Login`, `POST /api/Auth/Register`, `GET /api/Auth/CurrentUser` | Role-based registration (defaults to Customer) and JWT issuance. |
| Catalog | `GET /api/Category`, `GET /api/Product`, `GET /api/Product/GetProduct2` | Category list is public; product endpoints expose DTOs with category names. |
| Admin | `POST/PUT/DELETE /api/Category`, `POST/PUT/DELETE /api/Product` | Restricted to `Admin` or `Manager`. Handles file uploads for product images. |
| Orders | `POST /api/Order/CheckOut`, `GET /api/Order/mine`, `GET /api/Order`, `PUT /api/Order/{id}/status` | Checkout uses the authenticated user's cart. Admins can list/update all orders. |
| Cart | `GET /api/Cart/GetCart`, `POST /api/Cart`, `PUT /api/Cart`, `DELETE /api/Cart/{productId}` | Requires authentication; exposed to the customer module. |
| Customers | `GET /api/Customer`, `PUT /api/Customer/{id}/roles`, `PUT /api/Customer/{id}/status`, `DELETE /api/Customer/{id}` | Admin/Manager tooling for role management and lockout. |

The API stores product images under `wwwroot/images/products` and returns relative URLs (resolved client-side).

## Testing & Verification

- `npm run build` (already executed) – ensures the React app compiles.
- Use Swagger (`https://localhost:5001/swagger`) to exercise authentication, catalogue, and admin endpoints.
- Recommended manual flows:
  - Register a customer, login, browse catalogue, add to cart, checkout, view orders.
  - Assign Manager/Admin role via Customer management, refresh token, access `/admin`.
  - Manage categories/products/orders from the dashboard to confirm permissions.

## Deployment Notes

- Adjust `REACT_APP_API_BASE_URL` for production; rebuild the frontend.
- Host the API and the React build behind HTTPS; ensure CORS origin list is synced.
- Persist the `wwwroot/images/products` directory or wire it to cloud storage for uploaded assets.

## Further Work

- Add automated tests (React Testing Library + ASP.NET integration tests).
- Implement password reset / email confirmation flows.
- Enhance admin role management UI beyond the current prompt-based editing.
