# Frontend - Boutique & Tailoring SaaS

React + Vite + TypeScript + shadcn/ui frontend for the Boutique & Tailoring SaaS application.

## Tech Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **React Query** - Server state management
- **React Router** - Routing
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn components (do not modify)
│   ├── common/       # Reusable components (Button, EmptyState, etc.)
│   ├── layout/       # Layout components (Sidebar, Header, Layout)
│   └── providers/    # Context providers (QueryProvider)
├── pages/
│   ├── dashboard/    # Dashboard page
│   ├── customers/    # Customers management
│   ├── orders/       # Orders management
│   └── invoices/     # Invoices management
├── services/         # API service layer
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- ✅ JWT Authentication
- ✅ Protected Routes
- ✅ Responsive Layout (Mobile-first)
- ✅ Dashboard Overview
- ✅ Customer Management
- ✅ Order Management
- ✅ Invoice Management
- ✅ React Query for Data Fetching
- ✅ TypeScript for Type Safety

## Development Guidelines

- Use function components only
- TypeScript everywhere
- No inline styles - use Tailwind utilities
- All API calls go through `services/` directory
- Use React Query for server state
- Mobile-first responsive design
- Big buttons and clear labels for non-technical users

## API Integration

All API calls are centralized in the `services/` directory. The API client is configured with:
- Base URL from environment variables
- JWT token injection from localStorage
- Automatic error handling for 401 responses

## Authentication

Authentication uses JWT tokens stored in localStorage:
- `access_token` - Short-lived access token
- `refresh_token` - Long-lived refresh token

The API client automatically includes the access token in all requests.
