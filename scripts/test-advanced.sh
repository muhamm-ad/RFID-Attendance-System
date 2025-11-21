#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Advanced API tests"
echo "========================="

# Test Statistics
echo ""
echo "📊 Test Statistics"
curl "$BASE_URL/api/stats" | jq

sleep 2

# Test Search
echo ""
echo "🔍 Test Search - Name: 'Diallo'"
curl "$BASE_URL/api/search?q=Diallo" | jq

sleep 2

# Test Attendance report
echo ""
echo "📈 Test Report - Attendance"
curl "$BASE_URL/api/reports?type=attendance&start_date=2025-01-01&end_date=2025-12-31" | jq

sleep 2

# Test Payments report
echo ""
echo "💰 Test Report - Payments"
curl "$BASE_URL/api/reports?type=payments&start_date=2025-01-01&end_date=2025-12-31" | jq

sleep 2

# Test Summary report
echo ""
echo "📊 Test Report - Summary"
curl "$BASE_URL/api/reports?type=summary&start_date=2025-01-01&end_date=2025-12-31" | jq

echo ""
echo "✅ Advanced tests finished!"