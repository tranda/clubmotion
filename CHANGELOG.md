# Changelog

All notable changes to ClubMotion will be documented in this file.

## [0.8.4] - 2025-12-19

### Improved
- Payment entry workflow: clicking empty cell now defaults status to "Paid" for faster data entry
- Amount field pre-populated with expected value when opening payment modal
- Shows "Expected: X" label in payment modal for reference

### Changed
- Existing payments retain their current status when editing (only empty cells default to Paid)

## [0.8.3] - 2025-12-19

### Added
- Configurable payment rate presets stored in database
- New Rate Presets management page at /payments/presets
- CRUD operations for payment rate presets (add, edit, delete, toggle active)
- Dynamic preset buttons on payment initialization page loaded from database

### Changed
- Payment rate presets are no longer hardcoded in frontend
- Admins can now modify preset values without code changes

## [0.8.2] - 2025-01-24

### Added
- Auto-open attendance modal after creating new session for immediate attendance marking
- Smart modal behavior when deleting sessions: refreshes if other sessions remain, closes if last session deleted

### Improved
- Attendance workflow: create session → immediately mark attendance in one smooth flow
- Payment modal now preserves scroll position using Inertia's preserveScroll option
- Payment date format conversion between backend (d.m.Y) and frontend (Y-m-d) for proper display

## [0.8.1] - 2025-01-23

### Fixed
- Payment date now properly recorded when entering payments
- Payment date field now defaults to today's date for new payment entries
- Payment date automatically populates with today's date when status changes to "Paid"
- Payment date field now always visible and editable for admin and club managers regardless of payment status
- Admin and club managers can now change payment dates to record historical payments or correct dates

## [0.8.0] - 2025-01-06

### Changed
- Combined My Achievements and Club Achievements into single unified page with toggle view
- Added toggle buttons to switch between "My Achievements" and "Club Achievements" views
- Club achievements now highlight with green background and checkmark when user has personally won that achievement
- Simplified navigation with single "Achievements" link in header menu and home page
- Consolidated routes to `/achievements` with legacy redirects from old URLs

### Removed
- Separate Club Achievements page (merged into main Achievements page)

## [0.7.9] - 2025-01-06

### Added
- Club Achievements page showing all unique achievements earned by club members
- Page displays unique event/competition/medal combinations (no duplicates)
- Accessible at /club-achievements for all authenticated users
- "My Achievements" link on Club Achievements page to view personal achievements

## [0.7.8] - 2025-01-06

### Added
- Yearly Attendance Trend chart on Attendance page showing total attendance for all years with data
- Chart displays below Monthly Attendance Trend with green bars
- Only shows years with attendance > 0

## [0.7.7] - 2025-01-06

### Changed
- Attendance year dropdown now includes years from 2020 to current year + 2 (previously only showed current year ± 2)
- Attendance import now redirects to the imported year/month instead of current year

### Fixed
- Fixed issue where imported historical attendance data (e.g., 2022) wasn't visible because year wasn't in dropdown

## [0.7.6] - 2025-01-06

### Added
- Green checkmark (✓) displayed in front of member names in Members table for those who have registered in the app

## [0.7.5] - 2025-01-06

### Fixed
- Payment exemption reason "Other" now displays as "OTH" instead of "SAR" in payments table

## [0.7.4] - 2025-01-06

### Changed
- Payment amounts in Payments page table now display as whole numbers instead of shortened "k" format

## [0.7.3] - 2025-01-05

### Added
- Personal attendance chart now shows ratio format (attended/total sessions) for each month
- Inactive member login prevention with appropriate error message

### Changed
- Dynamic club name (CLUB_NAME) now used on Home page welcome message
- Removed max-width constraint for full-width responsive design

### Fixed
- Personal attendance count now only includes present=true records

## [0.7.2] - 2025-01-05

### Fixed
- Fixed user member relationship in attendance controller to correctly display personal monthly attendance chart

## [0.7.1] - 2025-01-05

### Added
- Personal monthly attendance chart for logged-in users on Attendance page
  - Displays "My Monthly Attendance - {year}" above general attendance chart
  - Green bars with current month highlighted in darker green
  - Shows user's attendance count per month throughout the year
  - Available for all users to track their own attendance

## [0.7.0] - 2025-01-05

### Changed
- Removed "Protected by ClubMotion Security" footer from login page

## [0.6.9] - 2025-01-05

### Added
- Dynamic club name from CLUB_NAME env variable
- Prominent first-time user message on login page with info box

### Changed
- Browser tab title now reads from APP_NAME env (defaults to "Club Management")
- Header logo displays custom club name from CLUB_NAME env
- First-time sign-in instructions now in highlighted blue box with icon

## [0.6.8] - 2025-01-05

### Added
- Category distribution chart on Members page
- List/Stats view toggle with icons on Members page
- Category statistics showing member count per category

### Changed
- Moved category chart from Attendance to Members page (better fit)
- Categories sorted by min_age then max_age (youngest to oldest)
- Category names display correctly on X-axis

### Fixed
- Fixed category name column reference (category_name vs name)
- Category chart now shows all categories with proper labels

## [0.6.7] - 2025-01-05

### Changed
- Improved category chart X-axis labels with larger, clearer text
- Category names now displayed prominently below each bar

## [0.6.6] - 2025-01-05

### Fixed
- Category distribution chart now uses fetched member categories correctly
- Added category data to attendance grid for proper stats calculation
- Chart displays actual category distribution from loaded members

## [0.6.5] - 2025-01-05

### Fixed
- Added missing MembershipCategory import in AttendanceController

## [0.6.4] - 2025-01-05

### Changed
- Category distribution chart now shows ALL categories (not just those with members)
- Categories sorted alphabetically on X-axis
- Y-axis shows member count (0 or more)

## [0.6.3] - 2025-01-05

### Added
- Category distribution bar chart in Attendance Stats view
  - Visual breakdown of active members by category
  - Color-coded bars with member counts
  - Sorted by count (most members first)

## [0.6.2] - 2025-01-05

### Fixed
- Fixed age-based category calculation for members with null category_id
- Categories now auto-assign to members without existing categories
- System properly handles both null categories and age-based category updates

## [0.6.1] - 2025-01-05

### Added
- Age-based category calculation system
  - Member categories now automatically calculated based on age
  - Categories update dynamically as members age without manual edits
  - Support for age ranges (min_age, max_age) in membership_categories table
  - Non-age-based categories (BCP, ACP, Paradragons) remain manual

### Changed
- Categories now recalculate on every member fetch, not just on create/update
- Category matching prioritizes narrowest age ranges first to avoid conflicts
- Category assignment happens automatically for age-based categories

### Technical
- Added is_age_based, min_age, max_age columns to membership_categories table
- Implemented calculateCategory() method in Member model with range size sorting
- Updated MemberController index() and show() methods to recalculate categories on fetch
- Auto-update database category when age-based category changes

## [0.6.0] - 2025-01-05

### Major Features

#### Complete Attendance Tracking System
- **Grid View**: Excel-like spreadsheet interface for marking attendance
  - Spreadsheet-style layout with members in rows and sessions in columns
  - Click checkbox to mark attendance (present/absent)
  - Real-time attendance counting per member and per session
  - Session type editing and deletion directly from grid headers
  - Sticky member name and number columns for easy scrolling
  - Color-coded session columns by type

- **Calendar View**: Monthly calendar visualization
  - Visual calendar grid showing all sessions per day
  - Click on any day to see detailed session information
  - Color-coded session indicators matching session types
  - Attendance count displayed for each day
  - Mobile-optimized with pull-to-refresh

- **Session Management**
  - Create sessions with date, type, and notes
  - Edit session types inline from grid view or calendar modal
  - Delete sessions with confirmation
  - Session types: Training (Blue), Competition (Green), Other (Orange)
  - Color-coding throughout the interface

- **Advanced Filtering**
  - Filter by year (current year ± 2 years)
  - Filter by month (all 12 months)
  - Filter by session type (Training, Competition, Other, or All)
  - Filter by member status (Active or All)
  - Filters persist across view changes

- **CSV Import**
  - Bulk import attendance data from CSV files
  - Auto-detection of members and sessions
  - Import validation and error reporting

- **Role-Based Access**
  - Admin and Superuser: Full edit access
  - Regular Users: View-only access
  - Mobile and desktop responsive design

#### Member Achievements System
- **Achievement Tracking**
  - Record member achievements with title, description, date, and category
  - Categories: Tournament, Competition, Award, Other
  - Display achievements on member profile pages
  - Group achievements by category with color coding
  - Chronological display of achievements

- **Achievement Management**
  - Add achievements to member profiles
  - Edit existing achievements
  - Delete achievements with confirmation
  - Category-based organization and filtering

### Minor Features & Enhancements

- **Session Types**: Simplified from 4 types to 3 (Training, Competition, Other)
- **Database Migration**: Update existing session types automatically
- **Mobile Optimization**: Pull-to-refresh on attendance calendar view
- **UI Improvements**: Enhanced hover effects and visual feedback
- **Performance**: Optimistic UI updates for instant feedback
- **Navigation**: Added Attendance link to main menu (desktop and mobile)

### Technical Improvements

- New database tables: `session_types`, `attendance_sessions`, `attendance_records`, `achievements`
- New models: SessionType, AttendanceSession, AttendanceRecord, Achievement
- New controllers: AttendanceController, AchievementsController
- Session type seeder with color definitions
- Database migrations for attendance and achievements systems
- React components with Inertia.js integration
- Real-time UI updates without page reloads

## [0.5.18] - 2025-01-05

### Added
- Complete attendance tracking system with session types
- Excel-like grid view for marking attendance
- Session types (Training, Match, Event, Tournament) with color coding
- Year and month selection filters for attendance view
- Session type filter to view specific session types
- Quick checkbox toggle for marking attendance
- Automatic counting of attendances per member and per session
- Add/delete session functionality for admin and superuser
- Attendance navigation link in main menu (desktop and mobile)

### Features
- **Attendance Grid**: Spreadsheet-style interface matching existing workflow
- **Session Types**: Color-coded sessions (Training-Blue, Match-Green, Event-Orange, Tournament-Purple)
- **Role-Based Access**: Admin/Superuser can edit, all users can view
- **Filtering**: Filter by year, month, and session type
- **Statistics**: Total attendance per member and per session displayed in grid
- **Responsive Design**: Works on desktop and mobile devices

### Technical
- New database tables: session_types, attendance_sessions, attendance_records
- AttendanceController with grid data, session creation, and attendance marking endpoints
- SessionType, AttendanceSession, AttendanceRecord models with relationships
- SessionTypeSeeder for default session types
- React Attendance/Index component with filtering and editing capabilities

## [0.5.17] - 2025-01-05

### Fixed
- Fixed bug where member image was deleted when updating is_active status

## [0.5.16] - 2025-01-05

### Added
- Added automatic redirect to login page with message when session expires (419 error)

## [0.5.15] - 2025-01-05

### Changed
- Increased session lifetime from 120 minutes (2 hours) to 1440 minutes (24 hours)

## [0.5.14] - 2025-01-05

### Changed
- Changed "All" filter value from empty string to "all" for better clarity

## [0.5.13] - 2025-01-05

### Fixed
- Fixed filter dropdown to correctly display "All" when empty filter is selected

## [0.5.12] - 2025-01-05

### Fixed
- Fixed Members page filter to always send filter parameter (including empty for "All")

## [0.5.11] - 2025-01-05

### Fixed
- Fixed filter not allowing "All" selection - now properly accepts empty filter value

## [0.5.10] - 2025-01-05

### Added
- Added member filter (All/Active) to Payments page with default to 'Active'

### Changed
- Set default filter to 'Active' on Members page
- Filter now persists when changing years in Payments page

### Fixed
- Removed max:50 limit on membership_number validation in member update

## [0.5.9] - 2025-01-05

### Changed
- Increased logo size on login screen (h-20 to h-40)

### Fixed
- Fixed 419 CSRF token error on logout
- Added CSRF token meta tag to app layout
- Excluded logout route from CSRF verification

## [0.5.8] - 2025-01-05

### Changed
- Replaced ClubMotion text title with logo image on login screen

## [0.5.7] - 2025-01-05

### Changed
- Removed "Expected" column from My Payments view for regular users
- Simplified table to show: Month, Amount, Status, Date, Method

## [0.5.6] - 2025-01-05

### Changed
- Moved date formatting to backend using Laravel Carbon (date:Y-m-d cast)
- Removed frontend date parsing logic - cleaner and more maintainable

## [0.5.5] - 2025-01-05

### Fixed
- Fixed ISO date parsing to correctly extract date from timestamp (split by 'T' instead of space)

## [0.5.4] - 2025-01-05

### Fixed
- Payment dates now display only date without time (YYYY-MM-DD format)
- Applied to My Payments, Member History, and Member Details pages

## [0.5.3] - 2025-01-05

### Fixed
- Fixed My Payments dashboard card link for regular users (was /payments, now /my-payments)

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
