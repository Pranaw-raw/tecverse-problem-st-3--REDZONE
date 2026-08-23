const API = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting ReserveHub Comprehensive Verification Test');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, name, details = '') => {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} — ${details}`);
      failed++;
    }
  };

  try {
    // 1. Test Health API
    const healthRes = await fetch(`${API}/health`).then((r) => r.json());
    assert(healthRes.status === 'healthy', 'Health Check API returns healthy');

    // 2. Test Demo Login for Student, Faculty, Admin
    const studentLogin = await fetch(`${API}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' }),
    }).then((r) => r.json());
    assert(studentLogin.user && studentLogin.token, 'Student Demo Login succeeds with JWT token');

    const adminLogin = await fetch(`${API}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' }),
    }).then((r) => r.json());
    assert(adminLogin.user?.role === 'admin' && adminLogin.token, 'Admin Demo Login succeeds with admin role');

    const studentToken = studentLogin.token;
    const adminToken = adminLogin.token;

    // 3. Test Resource Catalogue Browsing & Filtering (FR1)
    const allResources = await fetch(`${API}/resources`).then((r) => r.json());
    assert(allResources.resources && allResources.resources.length >= 6, 'FR1: Resource Catalogue returns all seeded campus facilities');

    const labResources = await fetch(`${API}/resources?category=Labs`).then((r) => r.json());
    assert(labResources.resources.every((r) => r.category === 'Labs'), 'FR1: Category filter returns only Labs');

    const gpuLab = allResources.resources.find((r) => r.id === 'res_gpu_lab_01');
    assert(gpuLab && gpuLab.capacity === 35, 'FR1: Resource details include correct capacity and specs');

    // 4. Test Interactive Calendar Availability (FR2)
    const todayStr = new Date().toISOString().split('T')[0];
    const availRes = await fetch(`${API}/resources/res_gpu_lab_01/availability?date=${todayStr}`).then((r) => r.json());
    assert(Array.isArray(availRes.bookedSlots), 'FR2: Resource availability returns booked slots array');
    assert(Array.isArray(availRes.recommendedAvailableSlots), 'FR2: Availability returns recommended open slots');

    // 5. Test Booking Creation & Atomic Conflict Detection (FR3)
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 5); // 5 days in future
    const start1 = new Date(testDate.setHours(10, 0, 0, 0)).toISOString();
    const end1 = new Date(testDate.setHours(12, 0, 0, 0)).toISOString();

    const booking1Res = await fetch(`${API}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_gpu_lab_01',
        title: 'Autonomous Navigation Testing',
        purpose: 'RoboCup SLAM experiments',
        startTime: start1,
        endTime: end1,
      }),
    });
    const booking1 = await booking1Res.json();
    assert(booking1Res.status === 201 && booking1.booking?.id, 'FR3: First booking request succeeds (201 Created)');

    // Attempt overlapping booking on same resource (Conflict Test)
    const startConflict = new Date(testDate.setHours(11, 0, 0, 0)).toISOString(); // Overlaps 10:00 - 12:00
    const endConflict = new Date(testDate.setHours(13, 0, 0, 0)).toISOString();

    const conflictRes = await fetch(`${API}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_gpu_lab_01',
        title: 'Conflicting AI Session',
        startTime: startConflict,
        endTime: endConflict,
      }),
    });
    assert(conflictRes.status === 409, 'FR3: Overlapping booking is atomically rejected with 409 Conflict');

    // 6. Test My Bookings & Cancellation (FR4)
    const myBookingsRes = await fetch(`${API}/bookings/my`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then((r) => r.json());
    assert(myBookingsRes.bookings.some((b) => b.id === booking1.booking.id), 'FR4: Created booking appears in user history');

    // Cancel booking
    const cancelRes = await fetch(`${API}/bookings/${booking1.booking.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ reason: 'Verification test cleanup' }),
    }).then((r) => r.json());
    assert(cancelRes.status === 'cancelled', 'FR4: User can cancel booking and slot is released');

    // Re-attempt booking now that the slot was cancelled (Slot Liberated Test)
    const rebookRes = await fetch(`${API}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        resourceId: 'res_gpu_lab_01',
        title: 'Re-booking Liberated Slot',
        startTime: start1,
        endTime: end1,
      }),
    });
    assert(rebookRes.status === 201, 'FR4: Cancelled slot is immediately free and re-bookable');

    // 7. Test Admin Management Panel CRUD & RBAC (FR5, FR6, FR7)
    // Non-admin attempting to create resource should get 403 Forbidden
    const forbiddenRes = await fetch(`${API}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Lab',
        category: 'Labs',
        location: 'Building X',
      }),
    });
    assert(forbiddenRes.status === 403, 'FR7: Non-admin cannot create resource (403 Forbidden RBAC)');

    // Admin creating a resource
    const newResRes = await fetch(`${API}/resources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Photonics & Laser Quantum Lab',
        category: 'Labs',
        location: 'Advanced Optics Wing 201',
        capacity: 15,
        description: 'Femtosecond laser cavity and optical breadboard table.',
      }),
    });
    const createdResource = await newResRes.json();
    assert(newResRes.status === 201 && createdResource.resource?.id, 'FR5: Admin creates new resource successfully');

    // Admin toggles status to maintenance
    const toggleRes = await fetch(`${API}/resources/${createdResource.resource.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'maintenance' }),
    }).then((r) => r.json());
    assert(toggleRes.status === 'maintenance', 'FR5: Admin toggles resource status to maintenance');

    // Booking a maintenance resource should be rejected
    const maintBookingRes = await fetch(`${API}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        resourceId: createdResource.resource.id,
        title: 'Test Session',
        startTime: start1,
        endTime: end1,
      }),
    });
    assert(maintBookingRes.status === 409, 'FR5: Booking on resource in maintenance is rejected with 409');

    // Admin deletes the test resource
    const deleteRes = await fetch(`${API}/resources/${createdResource.resource.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(deleteRes.message.includes('deleted'), 'FR5: Admin deletes resource successfully');

    // Admin views all campus bookings
    const allBookingsRes = await fetch(`${API}/bookings/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(Array.isArray(allBookingsRes.bookings) && allBookingsRes.bookings.length > 0, 'FR6: Admin can view all campus bookings across all users');

    // 8. Test QR Check-In (FR8)
    const qrCheckInRes = await fetch(`${API}/bookings/qr-checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ qrToken: 'RH-GPULAB-001' }),
    }).then((r) => r.json());
    assert(qrCheckInRes.booking?.status === 'checked-in', 'FR8: QR Check-in marks booking as checked-in / in-use');

    // 9. Test Automated Reminders & In-App Notifications (FR9)
    const testReminderRes = await fetch(`${API}/notifications/test-reminder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then((r) => r.json());
    assert(testReminderRes.notificationId, 'FR9: In-app 30-min reminder triggered and recorded');

    const notifs = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then((r) => r.json());
    assert(notifs.notifications.length > 0, 'FR9: User notification tray retrieves active reminders and confirmations');

    // 10. Test Analytics Dashboard (FR10)
    const analytics = await fetch(`${API}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(analytics.metrics?.totalBookings !== undefined, 'FR10: Analytics returns total bookings and utilization KPIs');
    assert(Array.isArray(analytics.categoryStats), 'FR10: Analytics returns category distribution');
    assert(analytics.hourlyDistribution && Object.keys(analytics.hourlyDistribution).length > 0, 'FR10: Analytics returns peak hourly distribution');

    const exportData = await fetch(`${API}/analytics/export`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    assert(Array.isArray(exportData.bookings), 'FR10: Export bookings endpoint returns structured campus booking records');

    console.log('\n====================================================');
    console.log(`🎉 Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Fatal error during test run:', err);
  }
};

runTests();
