# Changelog

All notable changes to ClubMotion will be documented in this file.

## [0.5.2] - 2025-01-05

### Fixed
- Fixed regular user redirect to /my-payments page
- Fixed year dropdown in My Payments to show only user's payment years
- Improved route handling to use plain paths instead of route() helper

## [0.5.1] - 2025-01-05

### Added
- Complete payment management system with Excel-like grid interface
- Payment tracking by year and month for all members
- Multi-year CSV import with auto-detection of year/month from column headers
- Support for exempt members (pocasni, saradnik) with exemption tracking
- Payment initialization wizard for new years
- CSV export template generation
- Role-based payment access (admin/superuser manage all, users view own)
- Payment statistics dashboard (total collected, paid, pending, overdue, exempt)
- Click-to-edit modal for individual payment records
- Member payment history view
- Recent payments section on member detail page

### Changed
- Updated members table to include exemption_status field
- Removed Ziggy route() helper dependency, using plain URL paths
- Enhanced member matching in CSV import (membership_number first, then email)
- Improved migration system with browser-accessible /migrate route for shared hosting

### Fixed
- Resolved route() helper JavaScript errors by using plain paths
- Fixed eager loading issues with payment relationships
- Corrected database column mapping in payment queries
- Added Serbian month name support in CSV import (MAJ→MAY, OKT→OCT)

### Technical
- New MembershipPayment model with relationships and helper methods
- PaymentController with full CRUD and bulk operations
- Multi-year import parser supporting various date formats
- Migration system compatible with shared hosting (no SSH)

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
