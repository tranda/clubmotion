# Changelog

All notable changes to ClubMotion will be documented in this file.

## [0.5.0] - 2025-01-04

### Added
- Complete migration from Laravel Blade to React with Inertia.js
- Mobile-friendly responsive UI with hamburger menu
- Role-based access control (Admin, Superuser, User)
- Authentication system with login, password reset, and logout
- First-time user registration with automatic account creation
- Member management CRUD operations
- Dashboard with active members statistics
- User profile view for regular members
- Payment section access for all users

### Features
- **Authentication**
  - Login with email and password
  - Forgot password functionality
  - Auto-create user accounts for members on first login
  - Session-based authentication with Laravel Sanctum

- **Role-Based Access**
  - Admin: Full system access
  - Superuser: Club management access
  - User: Personal profile and payment access only

- **Member Management**
  - View all members (Admin/Superuser)
  - Create new members (Admin/Superuser)
  - Edit member details (Admin/Superuser)
  - Delete members (Admin/Superuser)
  - View own profile (All users)

- **User Interface**
  - Responsive design for mobile and desktop
  - Hamburger menu for mobile navigation
  - Role-specific menu items and dashboard cards
  - Clean profile view without admin controls for regular users

- **Dashboard**
  - Active members count visible to all users
  - Role-specific cards (Members/Payments for admin, My Profile/My Payments for users)

### Technical
- React 18 with Inertia.js for SPA experience
- Tailwind CSS v3 for styling
- Vite for asset building
- Laravel 9.x backend
- Git-based deployment workflow
