#!/bin/bash

# API test script
BASE_URL="http://localhost:3000"

echo "🧪 RFID System API Tests"
echo "================================"

# 1. Test scanning a badge (paid student)
echo ""
echo "1️⃣ Test Scan - Paid student (Fatou Sow)"
curl -X POST "$BASE_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"rfid_uuid": "E5F6G7H8", "action": "in"}' | jq

sleep 2

# 2. Test scanning a badge (unpaid student)
echo ""
echo "2️⃣ Test Scan - Unpaid student (Ousmane Ba)"
curl -X POST "$BASE_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"rfid_uuid": "I9J0K1L2", "action": "in"}' | jq

sleep 2

# 3. Test scanning a badge (teacher)
echo ""
echo "3️⃣ Test Scan - Teacher (Mariama Ndiaye)"
curl -X POST "$BASE_URL/api/scan" \
  -H "Content-Type: application/json" \
  -d '{"rfid_uuid": "M3N4O5P6", "action": "in"}' | jq

sleep 2

# 4. Test retrieving all persons
echo ""
echo "4️⃣ Test GET - All persons"
curl "$BASE_URL/api/persons" | jq

sleep 2

# 5. Test retrieving only students
echo ""
echo "5️⃣ Test GET - Only students"
curl "$BASE_URL/api/persons?type=student" | jq

sleep 2

# 6. Test creating a new person
echo ""
echo "6️⃣ Test POST - Create a new student"
curl -X POST "$BASE_URL/api/persons" \
  -H "Content-Type: application/json" \
  -d '{
    "rfid_uuid": "NEW001",
    "type": "student",
    "nom": "Sarr",
    "prenom": "Moussa",
    "photo_path": "/photos/moussa_sarr.jpg"
  }' | jq

sleep 2

# 7. Test retrieving attendance log (replaces api/logs)
echo ""
echo "7️⃣ Test GET - Attendance log"
curl "$BASE_URL/api/attendance?limit=10" | jq

sleep 2

# 8. Test filtering attendance by date
echo ""
echo "8️⃣ Test GET - Today's attendance"
TODAY=$(date +%Y-%m-%d)
curl "$BASE_URL/api/attendance?date=$TODAY&limit=20" | jq

sleep 2

# 9. Test recording a payment
echo ""
echo "9️⃣ Test POST - Record a payment for Ousmane Ba (ID=3)"
curl -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 3,
    "trimester": 2,
    "amount": 50000,
    "payment_method": "cash"
  }' | jq

sleep 2

# 10. Test retrieving payments for a student
echo ""
echo "🔟 Test GET - Payments for student ID=3"
curl "$BASE_URL/api/payments?student_id=3" | jq

sleep 2

# 11. Test Statistics
echo ""
echo "1️⃣1️⃣ Test GET - General statistics"
curl "$BASE_URL/api/stats" | jq

sleep 2

# 12. Test Search
echo ""
echo "1️⃣2️⃣ Test GET - Search 'Diallo'"
curl "$BASE_URL/api/search?q=Diallo" | jq

echo ""
echo "✅ Tests completed!"