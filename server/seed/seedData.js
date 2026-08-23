const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, initDatabase, persistToDisk } = require('../config/database');

const seedData = async () => {
  console.log('Seeding initial database with demo resources and accounts...');
  await initDatabase();

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Seed Users
  const users = [
    {
      id: 'usr_admin_01',
      name: 'Dr. Sarah Jenkins (Admin)',
      email: 'admin@campus.edu',
      password_hash: adminPasswordHash,
      role: 'admin',
      department: 'Campus Infrastructure & Facilities'
    },
    {
      id: 'usr_student_01',
      name: 'Alex Chen (Student)',
      email: 'student@campus.edu',
      password_hash: passwordHash,
      role: 'student',
      department: 'Computer Science & AI'
    },
    {
      id: 'usr_faculty_01',
      name: 'Prof. Marcus Vance (Faculty)',
      email: 'faculty@campus.edu',
      password_hash: passwordHash,
      role: 'faculty',
      department: 'Robotics & Mechanical Eng.'
    }
  ];

  for (const u of users) {
    const existing = await dbGet('SELECT id FROM users WHERE id = ? OR email = ?', [u.id, u.email]);
    if (!existing) {
      await dbRun(
        `INSERT INTO users (id, name, email, password_hash, role, department) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [u.id, u.name, u.email, u.password_hash, u.role, u.department]
      );
    }
  }

  // 2. Seed Resources
  const resources = [
    {
      id: 'res_gpu_lab_01',
      name: 'Advanced AI & GPU Computing Cluster',
      category: 'Labs',
      location: 'Tech Innovation Tower, Room 402',
      capacity: 35,
      description: 'High-performance research lab featuring 8x NVIDIA H100 PCIe GPUs, 32-core AMD EPYC nodes, high-speed InfiniBand networking, and dual 86-inch 4K collaboration displays.',
      image_url: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['8x NVIDIA H100 Tensor Core GPUs', 'Gigabit Fiber Uplink', 'Air-Conditioned Cleanroom', 'Dual 4K Presentation Monitors', 'Ergonomic Workstations']),
      rules: JSON.stringify(['Authorized AI/ML project members only', 'No food or uncovered beverages', 'Clean temporary storage before session end', 'Badge check-in mandatory']),
      status: 'available'
    },
    {
      id: 'res_auditorium_01',
      name: 'Turing Grand Auditorium',
      category: 'Seminar Halls',
      location: 'Main Academic Quad, Central Block',
      capacity: 320,
      description: 'Flagship university auditorium equipped with a laser 4K projection system, line-array Dolby acoustic sound, multi-camera live streaming rigs, and full theatrical lighting control.',
      image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['320 Velvet Seating Capacity', '4K Christie Laser Projector', 'Dolby Atmos Spatial Audio', 'AV Control Booth & Multi-Cam Rig', 'Stage Green Room Access']),
      rules: JSON.stringify(['Prior AV technician briefing required', 'Emergency exits must remain unobstructed', 'Book at least 24 hours in advance']),
      status: 'available'
    },
    {
      id: 'res_robotics_01',
      name: 'IoT & Autonomous Robotics Prototyping Lab',
      category: 'Labs',
      location: 'Engineering Complex, Hall 105',
      capacity: 25,
      description: 'Hands-on engineering space with UR5e collaborative robot arms, solder rework stations, Keysight digital oscilloscopes, and optical motion capture tracking cameras.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Universal Robots UR5e Cobot', 'Keysight 100MHz Digital Oscilloscopes', 'Weller Soldering & Desoldering Stations', 'OptiTrack Motion Capture Arena']),
      rules: JSON.stringify(['Safety glasses required at all times', 'Return all component bins after use', 'Unplug soldering irons when leaving']),
      status: 'available'
    },
    {
      id: 'res_seminar_02',
      name: 'Ada Lovelace Executive Seminar Hall',
      category: 'Seminar Halls',
      location: 'Science & Discovery Center, 2nd Floor',
      capacity: 85,
      description: 'Tiered executive presentation room with dual interactive smart displays, beamforming ceiling microphone arrays for seamless hybrid conferences, and plush seating.',
      image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Dual 85-inch Smart Touchscreens', 'Shure Ceiling Mic Array', 'Zoom Rooms / Teams Native Rig', 'Tiered Amphitheater Seating']),
      rules: JSON.stringify(['Keep acoustic partitions intact', 'Wipe down touchscreens with provided microfiber cloths']),
      status: 'available'
    },
    {
      id: 'res_3dprint_01',
      name: 'Industrial 3D Printing & Rapid Prototyping Suite',
      category: 'Equipment',
      location: 'Makerspace, Ground Floor Bay 3',
      capacity: 8,
      description: 'Fleet of additive manufacturing hardware including Bambu Lab X1-Carbon multi-color printers, Formlabs Form 3+ stereolithography resin printer, and post-processing wash stations.',
      image_url: 'https://images.unsplash.com/photo-1631553127988-34863f69e6b5?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['4x Bambu Lab X1-Carbon (AMS)', 'Formlabs Form 3+ SLA Resin Unit', 'Form Cure & Wash Station', 'Fume Extraction Hood']),
      rules: JSON.stringify(['Complete print slicing safety tutorial before first use', 'Wear nitrile gloves when handling uncured photopolymer resin']),
      status: 'available'
    },
    {
      id: 'res_drone_01',
      name: 'DJI Matrice 300 RTK Aerial Photogrammetry Kit',
      category: 'Equipment',
      location: 'Geospatial & Surveying Depot, Room 12',
      capacity: 3,
      description: 'Commercial inspection and LiDAR drone package with Zenmuse H20T thermal sensor, dual D-RTK 2 high-precision GNSS mobile station, and 4 high-capacity flight batteries.',
      image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Zenmuse H20T Quad-Sensor Payload', 'D-RTK 2 Base Station & Tripod', '4x TB60 Flight Batteries & Charging Station', 'Rugged Pelican Transport Case']),
      rules: JSON.stringify(['Valid FAA/DGCA Drone Pilot certificate required', 'Pre-flight checklist must be signed off by depot in-charge']),
      status: 'available'
    },
    {
      id: 'res_sports_01',
      name: 'Olympic Indoor Sports Arena (Court A)',
      category: 'Sports',
      location: 'Campus Recreation & Athletic Complex',
      capacity: 50,
      description: 'FIBA-certified maple hardwood court marked for championship basketball and badminton, with electronic LED scoreboards and high-bay glare-free arena lighting.',
      image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['FIBA Grade Maple Hardwood', 'Wireless LED Scoreboard Controller', 'Badminton Net & Posts Kit', 'Locker Room & Shower Access']),
      rules: JSON.stringify(['Non-marking gum sole shoes mandatory', 'Maximum 2 consecutive hours per team booking']),
      status: 'available'
    },
    {
      id: 'res_microscope_01',
      name: 'Zeiss Field Emission Scanning Electron Microscope',
      category: 'Equipment',
      location: 'Materials Characterization Center, Basement B04',
      capacity: 4,
      description: 'Ultra-high resolution FE-SEM with Oxford EDS elemental analyzer and platinum sputter coater for nanoscale specimen imaging down to 0.8nm.',
      image_url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['0.8nm Resolution Electron Gun', 'Oxford X-Max 80mm² EDS Detector', 'Quorum Q150R Sputter Coater', 'Vibration Isolation Table']),
      rules: JSON.stringify(['Level 3 Certified Operator access only', 'Samples must be vacuum-compatible and moisture-free']),
      status: 'maintenance'
    }
  ];

  for (const r of resources) {
    const existing = await dbGet('SELECT id FROM resources WHERE id = ?', [r.id]);
    if (!existing) {
      await dbRun(
        `INSERT INTO resources (id, name, category, location, capacity, description, image_url, amenities, rules, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.category, r.location, r.capacity, r.description, r.image_url, r.amenities, r.rules, r.status]
      );
    }
  }

  // 3. Seed Sample Bookings (Today & Tomorrow)
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();

  const sampleBookings = [
    {
      id: 'bk_001',
      user_id: 'usr_student_01',
      resource_id: 'res_gpu_lab_01',
      title: 'Deep Learning Model Training — LLM Fine-Tuning',
      purpose: 'Training LLaMA weights for Final Year AI Capstone Project.',
      start_time: new Date(y, m, d, 9, 0).toISOString(),
      end_time: new Date(y, m, d, 11, 30).toISOString(),
      status: 'checked-in',
      qr_code_token: 'RH-GPULAB-001'
    },
    {
      id: 'bk_002',
      user_id: 'usr_faculty_01',
      resource_id: 'res_auditorium_01',
      title: 'Keynote Lecture: Future of Quantum Computing',
      purpose: 'Departmental guest lecture by Visiting Fellow Dr. Katherine Thorne.',
      start_time: new Date(y, m, d, 14, 0).toISOString(),
      end_time: new Date(y, m, d, 16, 30).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-AUDIT-002'
    },
    {
      id: 'bk_003',
      user_id: 'usr_student_01',
      resource_id: 'res_robotics_01',
      title: 'RoboCup Autonomous Navigation Testing',
      purpose: 'Tuning PID controllers and LiDAR SLAM mapping.',
      start_time: new Date(y, m, d + 1, 10, 0).toISOString(),
      end_time: new Date(y, m, d + 1, 12, 0).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-ROBOT-003'
    },
    {
      id: 'bk_004',
      user_id: 'usr_faculty_01',
      resource_id: 'res_3dprint_01',
      title: 'Biomimetic Drone Wing Structure Fabrication',
      purpose: 'Printing lightweight carbon-fiber PLA airfoils for wind tunnel test.',
      start_time: new Date(y, m, d, 13, 0).toISOString(),
      end_time: new Date(y, m, d, 15, 0).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-PRINT-004'
    },
    {
      id: 'bk_005',
      user_id: 'usr_student_01',
      resource_id: 'res_sports_01',
      title: 'Inter-Department Basketball Friendly Match',
      purpose: 'CS vs Mechanical Engineering match.',
      start_time: new Date(y, m, d - 1, 16, 0).toISOString(),
      end_time: new Date(y, m, d - 1, 18, 0).toISOString(),
      status: 'completed',
      qr_code_token: 'RH-SPORT-005'
    }
  ];

  for (const b of sampleBookings) {
    const existing = await dbGet('SELECT id FROM bookings WHERE id = ?', [b.id]);
    if (!existing) {
      await dbRun(
        `INSERT INTO bookings (id, user_id, resource_id, title, purpose, start_time, end_time, status, qr_code_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.user_id, b.resource_id, b.title, b.purpose, b.start_time, b.end_time, b.status, b.qr_code_token]
      );
    }
  }

  // 4. Seed Notifications
  const sampleNotifications = [
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      booking_id: 'bk_001',
      title: 'Booking Confirmed!',
      message: 'Your reservation for "Advanced AI & GPU Computing Cluster" is confirmed.',
      type: 'confirmation',
      is_read: 1
    },
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      booking_id: 'bk_001',
      title: 'Reminder: Booking in 30 Minutes',
      message: 'Your booking at Tech Innovation Tower (Room 402) starts shortly. Remember to check in via QR code.',
      type: 'reminder',
      is_read: 0
    },
    {
      id: uuidv4(),
      user_id: 'usr_faculty_01',
      booking_id: 'bk_002',
      title: 'Upcoming Keynote Reservation',
      message: 'Turing Grand Auditorium is reserved for your Keynote from 2:00 PM to 4:30 PM today.',
      type: 'reminder',
      is_read: 0
    }
  ];

  for (const n of sampleNotifications) {
    await dbRun(
      `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.user_id, n.booking_id, n.title, n.message, n.type, n.is_read]
    );
  }

  // 5. Seed Audit Logs
  const auditLogs = [
    {
      id: uuidv4(),
      user_id: 'usr_admin_01',
      action: 'SYSTEM_INIT',
      entity_type: 'SYSTEM',
      entity_id: 'SYS_01',
      details: 'ReserveHub Platform initialized with institutional catalogue.'
    },
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      action: 'BOOKING_CREATED',
      entity_type: 'BOOKING',
      entity_id: 'bk_001',
      details: 'Booked Advanced AI & GPU Computing Cluster'
    },
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      action: 'QR_CHECKIN',
      entity_type: 'BOOKING',
      entity_id: 'bk_001',
      details: 'QR Token scanned and validated at entrance kiosk.'
    }
  ];

  for (const a of auditLogs) {
    await dbRun(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.details]
    );
  }

  persistToDisk();
  console.log('Database successfully seeded with realistic campus resources, demo accounts, and bookings!');
};

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedData;
