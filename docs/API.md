# 📖 API Documentation - RFID System

**Base URL:** `http://localhost:3000`

**Format:** JSON

**Authentication:** No authentication required (public API)

---

## 🔐 Scan Badge

### `POST /api/scan`

Scans an RFID badge and verifies access based on person type and payment status.

**Description:**

- Checks if the badge exists in the database
- Retrieves the associated person's information
- For students, verifies payment for the current trimester
- Records the access attempt in the log (Attendance)
- Teachers, staff, and visitors always have access

**Body Parameters:**

- `rfid_uuid` (string, required): RFID badge UUID
- `action` (string, optional): Action to record (`"in"` or `"out"`). Default: `"in"`

**Request Example:**

```json
{
  "rfid_uuid": "A1B2C3D4",
  "action": "in"
}
```

**Response Success (200):**

```json
{
  "success": true,
  "access_granted": true,
  "person": {
    "id": 1,
    "rfid_uuid": "A1B2C3D4",
    "type": "student",
    "nom": "Diallo",
    "prenom": "Amadou",
    "photo_path": "/photos/amadou_diallo.jpg",
    "trimester1_paid": true,
    "trimester2_paid": true,
    "trimester3_paid": false
  },
  "message": "✅ Access granted - Student",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "current_trimester": 2,
  "action": "in"
}
```

**Response Error (400) - Invalid badge:**

```json
{
  "error": "Invalid or missing RFID UUID"
}
```

**Response Error (400) - Invalid action:**

```json
{
  "error": "Action must be \"in\" or \"out\""
}
```

**Response Success (200) - Unrecognized badge:**

```json
{
  "success": true,
  "access_granted": false,
  "person": null,
  "message": "❌ Unrecognized badge",
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

**Response Success (200) - Access denied (unpaid student):**

```json
{
  "success": true,
  "access_granted": false,
  "person": {
    "id": 1,
    "rfid_uuid": "A1B2C3D4",
    "type": "student",
    "nom": "Diallo",
    "prenom": "Amadou",
    "photo_path": "/photos/amadou_diallo.jpg",
    "trimester1_paid": false,
    "trimester2_paid": false,
    "trimester3_paid": false
  },
  "message": "❌ Payment required for trimester 2",
  "timestamp": "2025-11-15T10:30:00.000Z",
  "current_trimester": 2,
  "action": "in"
}
```

**Response Error (500):**

```json
{
  "error": "Server error during scan"
}
```

---

## 👥 Person Management

### `GET /api/persons`

Retrieves the list of all persons registered in the system.

**Description:**

- Returns all persons or filtered by type
- For students, includes payment information by trimester
- Results are sorted by last name and first name

**Query Parameters:**

- `type` (string, optional): Filter by person type
  - Possible values: `student`, `teacher`, `staff`, `visitor`

**Request Example:**

```bash
GET /api/persons
GET /api/persons?type=student
```

**Response Success (200):**

```json
[
  {
    "id": 1,
    "rfid_uuid": "A1B2C3D4",
    "type": "student",
    "nom": "Diallo",
    "prenom": "Amadou",
    "photo_path": "/photos/amadou_diallo.jpg",
    "trimester1_paid": true,
    "trimester2_paid": true,
    "trimester3_paid": false
  },
  {
    "id": 2,
    "rfid_uuid": "B2C3D4E5",
    "type": "teacher",
    "nom": "Sarr",
    "prenom": "Fatou",
    "photo_path": "/photos/fatou_sarr.jpg"
  }
]
```

**Response Error (500):**

```json
{
  "error": "Error while retrieving persons"
}
```

---

### `POST /api/persons`

Creates a new person in the system.

**Description:**

- Validates that all required fields are present
- Verifies that the type is valid
- The `rfid_uuid` must be unique and non-nullable

**Body Parameters:**

- `rfid_uuid` (string, required): RFID badge UUID
- `type` (string, required): Person type (`student`, `teacher`, `staff`, `visitor`)
- `nom` (string, required): Last name
- `prenom` (string, required): First name
- `photo_path` (string, required): Path to the photo

**Request Example:**

```json
{
  "rfid_uuid": "NEW001",
  "type": "student",
  "nom": "Sarr",
  "prenom": "Moussa",
  "photo_path": "/photos/moussa_sarr.jpg"
}
```

**Response Success (201):**

```json
{
  "id": 3,
  "rfid_uuid": "NEW001",
  "type": "student",
  "nom": "Sarr",
  "prenom": "Moussa",
  "photo_path": "/photos/moussa_sarr.jpg",
  "created_at": "2025-11-15T10:30:00.000Z",
  "updated_at": "2025-11-15T10:30:00.000Z"
}
```

**Response Error (400) - Missing fields:**

```json
{
  "error": "Missing required fields (rfid_uuid, type, nom, prenom, photo_path)"
}
```

**Response Error (400) - Invalid type:**

```json
{
  "error": "Invalid type. Allowed values: student, teacher, staff, visitor"
}
```

**Response Error (409) - RFID UUID already used:**

```json
{
  "error": "This RFID UUID is already associated with a person"
}
```

**Response Error (409) - Photo already used:**

```json
{
  "error": "This photo path is already used"
}
```

**Response Error (500):**

```json
{
  "error": "Error while creating the person"
}
```

---

### `GET /api/persons/[id]`

Retrieves information about a specific person by their ID.

**Description:**

- Returns complete details of a person
- For students, includes payment information by trimester

**Path Parameters:**

- `id` (integer, required): Person ID

**Request Example:**

```bash
GET /api/persons/1
```

**Response Success (200) - Student:**

```json
{
  "id": 1,
  "rfid_uuid": "A1B2C3D4",
  "type": "student",
  "nom": "Diallo",
  "prenom": "Amadou",
  "photo_path": "/photos/amadou_diallo.jpg",
  "trimester1_paid": true,
  "trimester2_paid": true,
  "trimester3_paid": false
}
```

**Response Success (200) - Other type:**

```json
{
  "id": 2,
  "rfid_uuid": "B2C3D4E5",
  "type": "teacher",
  "nom": "Sarr",
  "prenom": "Fatou",
  "photo_path": "/photos/fatou_sarr.jpg",
  "created_at": "2025-11-15T10:30:00.000Z",
  "updated_at": "2025-11-15T10:30:00.000Z"
}
```

**Response Error (400) - Invalid ID:**

```json
{
  "error": "Invalid ID"
}
```

**Response Error (404):**

```json
{
  "error": "Person not found"
}
```

**Response Error (500):**

```json
{
  "error": "Server error"
}
```

---

### `PUT /api/persons/[id]`

Updates information for an existing person.

**Description:**

- Updates only the fields provided in the request body
- All fields are optional - you can update just the badge (`rfid_uuid`) or any combination of fields
- Automatically updates the `updated_at` field

**Path Parameters:**

- `id` (integer, required): Person ID

**Body Parameters (all optional):**

- `rfid_uuid` (string, optional): RFID badge UUID (can be updated to change the badge)
- `type` (string, optional): Person type
- `nom` (string, optional): Last name
- `prenom` (string, optional): First name
- `photo_path` (string, optional): Path to the photo

**Request Example - Update badge only:**

```json
{
  "rfid_uuid": "NEW_BADGE_UUID"
}
```

**Request Example - Update all fields:**

```json
{
  "rfid_uuid": "A1B2C3D4",
  "type": "student",
  "nom": "Diallo",
  "prenom": "Amadou",
  "photo_path": "/photos/amadou_diallo_updated.jpg"
}
```

**Response Success (200):**

```json
{
  "id": 1,
  "rfid_uuid": "A1B2C3D4",
  "type": "student",
  "nom": "Diallo",
  "prenom": "Amadou",
  "photo_path": "/photos/amadou_diallo_updated.jpg",
  "created_at": "2025-11-15T10:30:00.000Z",
  "updated_at": "2025-11-15T11:00:00.000Z"
}
```

**Response Error (400) - Invalid ID:**

```json
{
  "error": "Invalid ID"
}
```

**Response Error (404):**

```json
{
  "error": "Person not found"
}
```

**Response Error (400) - No fields to update:**

```json
{
  "error": "No fields to update"
}
```

**Response Error (409) - RFID UUID conflict:**

```json
{
  "error": "This RFID UUID is already associated with another person"
}
```

**Response Error (409) - Photo path conflict:**

```json
{
  "error": "This photo path is already used"
}
```

**Response Error (500):**

```json
{
  "error": "Server error"
}
```

---

### `DELETE /api/persons/[id]`

Deletes a person from the system.

**Description:**

- Permanently deletes a person from the database
- Warning: This action is irreversible

**Path Parameters:**

- `id` (integer, required): Person ID

**Request Example:**

```bash
DELETE /api/persons/1
```

**Response Success (200):**

```json
{
  "message": "Person successfully deleted"
}
```

**Response Error (400) - Invalid ID:**

```json
{
  "error": "Invalid ID"
}
```

**Response Error (500):**

```json
{
  "error": "Server error"
}
```

---

## 📋 Attendance (Log)

### `GET /api/attendance`

Retrieves attendance logs (access attempt log).

**Description:**

- Returns badge scan history
- Includes associated person information
- Supports pagination and multiple filters

**Query Parameters:**

- `limit` (integer, optional): Maximum number of results. Default: `100`
- `offset` (integer, optional): Offset for pagination. Default: `0`
- `date` (string, optional): Filter by date (format: `YYYY-MM-DD`)
- `status` (string, optional): Filter by status (`success` or `failed`)
- `action` (string, optional): Filter by action (`in` or `out`)

**Request Example:**

```bash
GET /api/attendance
GET /api/attendance?date=2025-11-15&status=success&limit=50
GET /api/attendance?action=in&offset=0&limit=20
```

**Response Success (200):**

```json
[
  {
    "id": 1,
    "person_id": 1,
    "action": "in",
    "status": "success",
    "timestamp": "2025-11-15T10:30:00.000Z",
    "person_name": "Diallo Amadou",
    "person_type": "student",
    "rfid_uuid": "A1B2C3D4"
  },
  {
    "id": 2,
    "person_id": 2,
    "action": "out",
    "status": "success",
    "timestamp": "2025-11-15T11:00:00.000Z",
    "person_name": "Sarr Fatou",
    "person_type": "teacher",
    "rfid_uuid": "B2C3D4E5"
  }
]
```

**Response Error (500):**

```json
{
  "error": "Error while retrieving attendance logs"
}
```

---

## 💰 Payments

### `POST /api/payments`

Records a payment for a student for a given trimester.

**Description:**

- Creates a payment and associates it with a student for a specific trimester
- Verifies that the student exists and is of type `student`
- Prevents duplicates (only one payment per trimester per student)

**Body Parameters:**

- `student_id` (integer, required): Student ID
- `trimester` (integer, required): Trimester number (1, 2, or 3)
- `amount` (number, required): Payment amount
- `payment_method` (string, required): Payment method (`cash`, `card`, or `bank_transfer`)

**Request Example:**

```json
{
  "student_id": 3,
  "trimester": 2,
  "amount": 50000,
  "payment_method": "cash"
}
```

**Response Success (201):**

```json
{
  "payment": {
    "id": 1,
    "amount": 50000,
    "payment_method": "cash",
    "payment_date": "2025-11-15T10:30:00.000Z"
  },
  "student_payment": {
    "id": 1,
    "student_id": 3,
    "payment_id": 1,
    "trimester": 2
  }
}
```

**Response Error (400) - Champs manquants:**

```json
{
  "error": "Missing required fields (student_id, trimester, amount, payment_method)"
}
```

**Response Error (400) - Invalid trimester:**

```json
{
  "error": "Invalid trimester. Allowed values: 1, 2, 3"
}
```

**Response Error (400) - Invalid payment method:**

```json
{
  "error": "Invalid payment method"
}
```

**Response Error (404):**

```json
{
  "error": "Student not found"
}
```

**Response Error (409) - Payment already exists:**

```json
{
  "error": "Payment for trimester 2 already exists"
}
```

**Response Error (500):**

```json
{
  "error": "Error while registering payment"
}
```

---

### `GET /api/payments`

Retrieves all payments for a student.

**Description:**

- Returns the complete list of payments for a student
- Includes payment details (amount, method, date)
- Results are sorted by trimester

**Query Parameters:**

- `student_id` (integer, required): Student ID

**Request Example:**

```bash
GET /api/payments?student_id=3
```

**Response Success (200):**

```json
[
  {
    "id": 1,
    "student_id": 3,
    "trimester": 1,
    "payment_id": 1,
    "amount": 50000,
    "payment_method": "cash",
    "payment_date": "2025-10-15T10:30:00.000Z"
  },
  {
    "id": 2,
    "student_id": 3,
    "trimester": 2,
    "payment_id": 2,
    "amount": 50000,
    "payment_method": "card",
    "payment_date": "2025-11-15T10:30:00.000Z"
  }
]
```

**Response Error (400):**

```json
{
  "error": "student_id is required"
}
```

**Response Error (500):**

```json
{
  "error": "Error while retrieving payments"
}
```

---

## 📊 Statistics

### `GET /api/stats`

Generates comprehensive system statistics.

**Description:**

- General statistics (total number of persons by type)
- Attendance statistics for the specified range
- Attendance statistics by person type
- Payment statistics for the current trimester
- Top 10 persons with the most entries this month
- Recent activity (last 20 entries/exits)

**Query Parameters:**

- `startDate` (string, optional): Range start (format `YYYY-MM-DD`). Default: today.
- `endDate` (string, optional): Range end (format `YYYY-MM-DD`). Default: today.
- `date` (string, optional): Legacy alias equivalent to setting both `startDate` and `endDate`.

**Request Example:**

```bash
GET /api/stats
GET /api/stats?startDate=2025-11-10&endDate=2025-11-15
GET /api/stats?date=2025-11-15 # Backward compatible
```

**Response Success (200):**

```json
{
  "range": {
    "start": "2025-11-10",
    "end": "2025-11-15",
    "days": 6
  },
  "general": {
    "total_persons": 150,
    "total_students": 120,
    "total_teachers": 15,
    "total_staff": 10,
    "total_visitors": 5
  },
  "attendance_summary": {
    "total": 245,
    "success": 230,
    "failed": 15,
    "entries": 120,
    "exits": 125
  },
  "attendance_by_type": [
    {
      "type": "student",
      "count": 180,
      "success": 170,
      "failed": 10
    },
    {
      "type": "teacher",
      "count": 50,
      "success": 50,
      "failed": 0
    }
  ],
  "payments": {
    "current_trimester": 2,
    "total_students": 120,
    "students_paid": 95,
    "students_unpaid": 25,
    "payment_rate": "79.17%"
  },
  "top_attendance": [
    {
      "id": 1,
      "nom": "Diallo",
      "prenom": "Amadou",
      "type": "student",
      "attendance_count": 45
    }
  ],
  "recent_activity": [
    {
      "id": 1,
      "action": "in",
      "status": "success",
      "attendance_date": "2025-11-15T10:30:00.000Z",
      "nom": "Diallo",
      "prenom": "Amadou",
      "type": "student"
    }
  ]
}
```

**Response Error (500):**

```json
{
  "error": "Error while generating statistics"
}
```

---

## 🔍 Search

### `GET /api/search`

Searches for persons by name, first name, or badge ID.

**Description:**

- Searches in names, first names, and badge IDs
- Supports filtering by person type
- Limits results to 50 persons
- Case-insensitive search (LIKE)

**Query Parameters:**

- `q` (string, required): Search term (minimum 2 characters)
- `type` (string, optional): Filter by person type (`student`, `teacher`, `staff`, `visitor`)

**Request Example:**

```bash
GET /api/search?q=Diallo
GET /api/search?q=Amadou&type=student
```

**Response Success (200):**

```json
[
  {
    "id": 1,
    "rfid_uuid": "A1B2C3D4",
    "type": "student",
    "nom": "Diallo",
    "prenom": "Amadou",
    "photo_path": "/photos/amadou_diallo.jpg",
    "badge_uuid": "A1B2C3D4"
  }
]
```

**Response Error (400):**

```json
{
  "error": "Search must contain at least 2 characters"
}
```

**Response Error (500):**

```json
{
  "error": "Error during search"
}
```

---

## 📈 Reports

### `GET /api/reports`

Generates detailed reports by period.

**Description:**

- Generates different types of reports based on the `type` parameter
- All reports require a period (start and end date)
- Dates are inclusive

**Query Parameters:**

- `start_date` (string, required): Start date (format: `YYYY-MM-DD`)
- `end_date` (string, required): End date (format: `YYYY-MM-DD`)
- `type` (string, optional): Report type
  - `attendance` (default): Attendance report
  - `payments`: Payments report
  - `summary`: Global summary

**Request Example:**

```bash
GET /api/reports?type=attendance&start_date=2025-11-01&end_date=2025-11-15
GET /api/reports?type=payments&start_date=2025-11-01&end_date=2025-11-15
GET /api/reports?type=summary&start_date=2025-11-01&end_date=2025-11-15
```

**Response Success (200) - Type: attendance:**

```json
{
  "start_date": "2025-11-01",
  "end_date": "2025-11-15",
  "generated_at": "2025-11-15T10:30:00.000Z",
  "type": "attendance",
  "daily_summary": [
    {
      "date": "2025-11-01",
      "total_scans": 150,
      "successful": 140,
      "failed": 10,
      "entries": 75,
      "exits": 75
    }
  ],
  "person_summary": [
    {
      "id": 1,
      "nom": "Diallo",
      "prenom": "Amadou",
      "type": "student",
      "total_scans": 30,
      "successful_scans": 28,
      "entries": 15,
      "first_scan": "2025-11-01T08:00:00.000Z",
      "last_scan": "2025-11-15T18:00:00.000Z"
    }
  ]
}
```

**Response Success (200) - Type: payments:**

```json
{
  "start_date": "2025-11-01",
  "end_date": "2025-11-15",
  "generated_at": "2025-11-15T10:30:00.000Z",
  "type": "payments",
  "summary": [
    {
      "trimester": 2,
      "students_paid": 50,
      "total_amount": 2500000,
      "payment_method": "cash",
      "payment_count": 30
    }
  ],
  "details": [
    {
      "nom": "Diallo",
      "prenom": "Amadou",
      "trimester": 2,
      "amount": 50000,
      "payment_method": "cash",
      "payment_date": "2025-11-10T10:30:00.000Z"
    }
  ]
}
```

**Response Success (200) - Type: summary:**

```json
{
  "start_date": "2025-11-01",
  "end_date": "2025-11-15",
  "generated_at": "2025-11-15T10:30:00.000Z",
  "type": "summary",
  "attendance": {
    "total_scans": 2250,
    "successful": 2100,
    "failed": 150,
    "unique_persons": 120,
    "success_rate": "93.33%"
  },
  "payments": {
    "total_payments": 85,
    "total_amount": 4250000
  }
}
```

**Response Error (400) - Missing dates:**

```json
{
  "error": "start_date and end_date are required (format: YYYY-MM-DD)"
}
```

**Response Error (400) - Invalid type:**

```json
{
  "error": "Invalid report type. Use: attendance, payments, or summary"
}
```

**Response Error (500):**

```json
{
  "error": "Error while generating report"
}
```

---

## 📝 Important Notes

### Trimesters

The system uses an academic calendar with 3 trimesters:

- **Trimester 1:** October to January
- **Trimester 2:** February to May
- **Trimester 3:** June to September

### Person Types

- `student`: Student (payment required per trimester)
- `teacher`: Teacher (access always authorized)
- `staff`: Administrative staff (access always authorized)
- `visitor`: Visitor (access always authorized)

### Payment Methods

- `cash`: Cash
- `card`: Bank card
- `bank_transfer`: Bank transfer

### HTTP Status Codes

- `200`: Success
- `201`: Created successfully
- `400`: Invalid request (missing or invalid parameters)
- `404`: Resource not found
- `409`: Conflict (resource already exists)
- `500`: Server error
