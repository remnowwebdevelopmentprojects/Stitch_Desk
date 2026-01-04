# RemnowInvoice Django Backend

Django REST Framework API backend for RemnowInvoice application, converted from Flask.

## Features

- User authentication (Token-based)
- Quotation/Invoice management
- PDF generation using WeasyPrint
- GST calculations (CGST, SGST, IGST)
- Bulk export functionality
- Share tokens for secure PDF access
- WhatsApp sharing integration

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Database Configuration

Create a `.env` file in the project root with the following variables:

```env
SECRET_KEY=your-secret-key-here-change-in-production
DB_NAME=remnow_invoice
DB_USER=postgres
DB_PASSWORD=12345
DB_HOST=localhost
DB_PORT=5432
```

### 3. Database Migration

```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 5. Run Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Documentation (Swagger/OpenAPI)

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/swagger/`
- **ReDoc**: `http://localhost:8000/redoc/`
- **OpenAPI Schema (JSON)**: `http://localhost:8000/swagger.json`
- **OpenAPI Schema (YAML)**: `http://localhost:8000/swagger.yaml`

### Using Swagger UI with Authentication

To test authenticated endpoints in Swagger:

1. **Get your authentication token:**
   - First, register/login using `/api/auth/register/` or `/api/auth/login/`
   - Copy the `token` value from the response

2. **Authorize in Swagger:**
   - Click the **"Authorize"** button (🔒 icon) at the top right of Swagger UI
   - In the "Value" field, enter: `Token <your-token-here>`
     - Example: `Token 9944b09199c62bcf9418ad846dd0e4bbdfc6ee4b`
   - Click **"Authorize"** then **"Close"**

3. **Test endpoints:**
   - Now you can test authenticated endpoints like `/api/quotations/`, `/api/items/`, etc.
   - The token will be automatically included in all requests

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register a new user
- `POST /api/auth/login/` - Login and get token
- `POST /api/auth/logout/` - Logout (requires authentication)

### Items
- `GET /api/items/` - List all items (authenticated)
- `POST /api/items/` - Create a new item (authenticated)
- `GET /api/items/{id}/` - Get item details (authenticated)
- `PUT /api/items/{id}/` - Update item (authenticated)
- `DELETE /api/items/{id}/` - Delete item (authenticated)

### Quotations/Invoices
- `GET /api/quotations/` - List all quotations/invoices (authenticated)
- `POST /api/quotations/` - Create a new quotation/invoice (authenticated)
- `GET /api/quotations/{id}/` - Get quotation/invoice details (authenticated)
- `PUT /api/quotations/{id}/` - Update quotation/invoice (authenticated)
- `DELETE /api/quotations/{id}/` - Delete quotation/invoice (authenticated)
- `POST /api/quotations/{id}/void/` - Void an invoice (authenticated)
- `GET /api/quotations/{id}/pdf/` - Generate PDF (authenticated)
- `GET /api/quotations/{id}/whatsapp/` - Get WhatsApp share link (authenticated)

### Settings
- `GET /api/settings/payment-info/` - Get payment information (authenticated)
- `POST /api/settings/payment-info/` - Update payment information (authenticated)
- `POST /api/settings/prefixes/` - Update document prefixes (authenticated)

### Bulk Operations
- `POST /api/bulk-export-count/` - Get count of documents in date range (authenticated)
- `POST /api/bulk-export/` - Export documents as ZIP (authenticated)

### Public
- `GET /api/d/{token}/` - View shared PDF using token (public, no auth required)

## Authentication

All endpoints except `/api/auth/register/`, `/api/auth/login/`, and `/api/d/{token}/` require authentication.

Include the token in the request headers:
```
Authorization: Token <your-token-here>
```

## Example API Usage

### Register
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user",
    "name": "John Doe",
    "password": "password123",
    "password_confirm": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Create Quotation
```bash
curl -X POST http://localhost:8000/api/quotations/ \
  -H "Authorization: Token <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quotation_no": "QUO/25-26/001",
    "date": "2024-01-15",
    "to_address": "Client Name\nClient Address",
    "currency": "INR",
    "document_type": "invoice",
    "items": [
      {
        "description": "Service 1",
        "hsn_code": "998314",
        "amount": "10000"
      }
    ],
    "gst_type": "intrastate",
    "cgst_rate": 9,
    "sgst_rate": 9
  }'
```

## Project Structure

```
backend/
├── backend/          # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── ...
├── invoice/         # Main app
│   ├── models.py    # User, Quotation, Item models
│   ├── serializers.py
│   ├── views.py     # API views
│   └── urls.py
├── templates/       # PDF templates
│   └── layout/
│       ├── index.html
│       └── quotation.html
├── assets/          # Static assets (logo, signature, etc.)
└── requirements.txt
```

## Notes

- The application uses PostgreSQL as the database
- PDF generation requires WeasyPrint and its dependencies
- Templates and assets are copied from the Flask application
- CORS is configured for React frontend integration (localhost:3000)

