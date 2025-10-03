# ClubMotion

A modern club member management system built with Laravel and React.

## Version

**0.5.0** - See [CHANGELOG.md](CHANGELOG.md) for release history.

## Features

- **Member Management** - CRUD operations for club members
- **Role-Based Access Control** - Admin, Superuser, and User roles with different permissions
- **Authentication** - Secure login with password reset functionality
- **Responsive Design** - Mobile-friendly UI with hamburger menu
- **Dashboard** - Overview of club statistics
- **Payment Tracking** - View payment obligations (coming soon)

## Tech Stack

- **Backend**: Laravel 9.x
- **Frontend**: React 18 + Inertia.js
- **Styling**: Tailwind CSS v3
- **Build Tool**: Vite
- **Authentication**: Laravel Sanctum
- **Database**: MySQL

## User Roles

- **Admin** - Full system access
- **Superuser** - Club management access (manage members, payments)
- **User** - Personal profile and payment access only

## Getting Started

### Prerequisites

- PHP 8.0+
- Composer
- Node.js 16+
- MySQL

### Installation

1. Clone the repository
```bash
git clone https://github.com/tranda/clubmotion.git
cd clubmotion
```

2. Install PHP dependencies
```bash
composer install
```

3. Install JavaScript dependencies
```bash
npm install
```

4. Create environment file
```bash
cp .env.example .env
```

5. Generate application key
```bash
php artisan key:generate
```

6. Configure database in `.env` file

7. Run migrations
```bash
php artisan migrate
```

8. Seed roles
```bash
php artisan db:seed --class=RoleSeeder
```

9. Build assets
```bash
npm run build
```

10. Start development server
```bash
php artisan serve
```

## Development

### Build Assets

```bash
npm run dev   # Development with hot reload
npm run build # Production build
```

### First Time Login

Members can create their account on first login:
1. Enter email address (must exist in members table)
2. Choose a password
3. Account is created and logged in automatically

## Deployment

This project uses Git-based deployment:
1. Make changes locally
2. Run `npm run build`
3. Commit and push (includes build artifacts)
4. Server auto-pulls changes

## Contributing

This is a private project for club management.

## License

Proprietary - All rights reserved.

## Developer Notes

For Claude Code AI assistant instructions, see [CLAUDE.md](CLAUDE.md).
