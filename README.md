# RFID Access Control System

A comprehensive attendance management and access control system based on RFID technology, designed for educational institutions. The system manages entry/exit tracking, trimester payment tracking, and generates detailed statistics.

## Features

### Access Control

- **RFID Scanning**: Automatic recording of entries and exits via RFID badges
- **Payment Verification**: Automatic payment status check for students
- **Multi-type Management**: Support for students, teachers, staff, and visitors
- **Access Logs**: Complete history of all access attempts (success/failure)

### Person Management

- **Full CRUD**: Create, read, update, and delete persons
- **Person Types**: Students, teachers, administrative staff, visitors
- **Photos**: Photo association for each person
- **Search**: Quick search by name, first name, or RFID UUID

### Payment Management

- **Trimester Payments**: Payment tracking for 3 trimesters
- **Payment Methods**: Cash, card, bank transfer
- **Payment Status**: Clear visualization of payment status by trimester
- **Conditional Access Control**: Students must have paid the current trimester to access

### Statistics and Reports

- **Statistics Dashboard**: Comprehensive system overview
- **Statistics by Type**: Detailed analysis by person category
- **Attendance Trends**: Evolution charts over a given period
- **Top 10 Attendance**: Ranking of most present persons
- **Success Rate**: Statistics on successful/failed access
- **Customizable Reports**: Report generation with advanced filters

### Activity Log

- **Complete History**: All recorded RFID scans
- **Advanced Filters**: By date, person type, status, action
- **Export**: Ability to export data

## Technologies Used

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [@vercel/postgres](https://vercel.com/docs/storage/vercel-postgres)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Date handling**: [date-fns](https://date-fns.org/)

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **PostgreSQL Database**: Vercel Postgres (recommended for Vercel deployment) or any PostgreSQL database

## Installation

1. **Clone the repository** (or download the project)

```bash
git clone <repository-url>
cd rfid-attendance
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure the database**

   For local development, you'll need to set up environment variables for PostgreSQL:

   ```bash
   # .env.local
   POSTGRES_URL="your-postgres-connection-string"
   POSTGRES_PRISMA_URL="your-postgres-connection-string"
   POSTGRES_URL_NON_POOLING="your-postgres-connection-string"
   ```

   For Vercel deployment:
   - Add a Vercel Postgres database in your Vercel project dashboard
   - The connection variables will be automatically injected

   The database is automatically initialized when the application starts. Test data (seed) is also automatically loaded.

4. **Run the application in development mode**

```bash
npm run dev
```

5. **Access the application**

Open your browser at: [http://localhost:3000](http://localhost:3000)

The application automatically redirects to the dashboard: `/dashboard`

## Project Structure

```text
rfid-attendance/
├── app/                    # Next.js application
│   ├── api/               # REST API routes
│   │   ├── attendance/   # Attendance management
│   │   ├── payments/     # Payment management
│   │   ├── persons/      # Person management
│   │   ├── reports/      # Report generation
│   │   ├── scan/         # RFID scan endpoint
│   │   ├── search/       # Search
│   │   └── stats/        # Statistics
│   ├── dashboard/        # Main dashboard page
│   ├── layout.tsx        # Main layout
│   └── page.tsx          # Home page (redirect)
├── components/            # React components
│   ├── LogsTable.tsx     # Access logs table
│   ├── PaymentManagement.tsx  # Payment management
│   ├── PersonManagement.tsx   # Person management
│   ├── Reports.tsx       # Reports
│   ├── StatisticsDashboard.tsx # Statistics dashboard
│   └── ThemeToggle.tsx   # Light/dark theme toggle
├── docs/                 # Documentation
│   └── API.md           # Complete API documentation
├── lib/                  # Libraries and utilities
│   ├── db.ts            # Database configuration and initialization
│   ├── seed.ts          # Test data (seed)
│   ├── types.ts          # TypeScript types
│   └── utils.ts         # Utility functions
├── scripts/              # Utility scripts
│   ├── test-api.sh      # API tests
│   └── test-advanced.sh # Advanced tests
└── public/               # Static files
```

## Database

The system uses PostgreSQL with the following tables:

### Main Tables

- **Persons**: Information about persons (students, teachers, staff, visitors)
- **Attendance**: RFID scan history (entries/exits)
- **Payments**: Payment records
- **student_payments**: Link between students and payments by trimester

### Database Schema

```sql
Persons
├── id (PRIMARY KEY)
├── rfid_uuid (UNIQUE)
├── type (student|teacher|staff|visitor)
├── nom
├── prenom
├── photo_path (UNIQUE)
├── created_at
└── updated_at

Attendance
├── id (PRIMARY KEY)
├── person_id (FOREIGN KEY → Persons)
├── action (in|out)
├── status (success|failed)
└── attendance_date

Payments
├── id (PRIMARY KEY)
├── amount
├── payment_method (cash|card|bank_transfer)
└── payment_date

student_payments
├── id (PRIMARY KEY)
├── student_id (FOREIGN KEY → Persons)
├── payment_id (FOREIGN KEY → Payments)
└── trimester (1|2|3)
```

## REST API

The application exposes a complete REST API. Detailed documentation is available in [`docs/API.md`](docs/API.md).

### Main Endpoints

- `POST /api/scan` - Scan an RFID badge
- `GET /api/persons` - List all persons
- `POST /api/persons` - Create a new person
- `GET /api/persons/[id]` - Get a specific person
- `PUT /api/persons/[id]` - Update a person
- `DELETE /api/persons/[id]` - Delete a person
- `GET /api/attendance` - Get attendance history
- `GET /api/payments?student_id=X` - Get a student's payments
- `POST /api/payments` - Record a payment
- `GET /api/stats` - Get statistics
- `GET /api/reports` - Generate reports
- `GET /api/search` - Search for persons

## Usage

### Scan an RFID Badge

To scan a badge, send a POST request to `/api/scan`:

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uuid": "STU-0001",
    "action": "in"
  }'
```

### Manage Persons

Access the "Persons" tab in the dashboard to:

- Add new persons
- Modify existing information
- Delete persons
- Search the list

### Manage Payments

In the "Payments" tab:

- View all students and their payment status
- Record a new payment
- Filter by trimester

### View Statistics

The "Statistics" tab displays:

- Total number of persons by type
- Attendance statistics over a period
- Trend charts
- Top 10 attendance
- Recent activity

### Generate Reports

The "Reports" tab allows you to:

- Filter by date, person type, status
- Export data
- View detailed reports

## Test Data

The system includes automatic test data (seed) that is loaded on first initialization:

- **28 persons**: 15 students, 5 teachers, 4 staff members, 4 visitors
- **Attendance data**: November 2024 - January 2025
- **Payments**: Distributed across 3 trimesters

Seed data is defined in `lib/seed.ts` and is only loaded if the database is empty.

## User Interface

The interface is modern and responsive, with:

- **Clean Design**: Clear and intuitive interface
- **Responsive**: Adapted for mobile, tablet, and desktop
- **Light/Dark Theme**: Toggle available
- **Tab Navigation**: Quick access to different sections
- **Interactive Charts**: Visualization of attendance trends

## Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build the application
npm start            # Start production server

# Code Quality
npm run lint         # Check code with ESLint
```

## Important Notes

- **Student Access Control**: Students must have paid the current trimester to access
- **Teachers and Staff**: Access always granted
- **Visitors**: Access granted (can be modified as needed)
- **Database**: PostgreSQL via @vercel/postgres for Vercel deployment compatibility
- **Security**: Currently without authentication (to be added for production)

## Contributing

Contributions are welcome! Feel free to:

1. Fork the project
2. Create a branch for your feature
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

See the [LICENSE](LICENSE) file for more details.

## Known Issues / Future Improvements

- [ ] Add user authentication
- [ ] Multi-institution support
- [ ] Email/SMS notifications
- [ ] Excel/PDF report export
- [ ] Mobile application
- [ ] Integration with external payment systems
- [ ] Multi-language support

## Support

For any questions or issues, please open an issue on the project repository.

---

**Developed to facilitate attendance management in educational institutions**
