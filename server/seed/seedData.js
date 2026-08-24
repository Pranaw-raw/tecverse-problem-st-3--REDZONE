const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll, initDatabase, persistToDisk } = require('../config/database');

const seedData = async () => {
  console.log('Seeding initial database with demo resources and accounts...');
  await initDatabase();

  const passwordHash = await bcrypt.hash('Password@123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);

  // 1. Seed Users (Clean, realistic identities)
  const users = [
    {
      id: 'usr_admin_01',
      name: 'REDZONE',
      email: 'admin@campus.edu',
      password_hash: adminPasswordHash,
      role: 'admin',
      department: 'Campus Infrastructure & Operations'
    },
    {
      id: 'usr_student_01',
      name: 'Pranaw kumar',
      email: 'student@campus.edu',
      password_hash: passwordHash,
      role: 'student',
      department: 'Computer Science & AI'
    },
    {
      id: 'usr_faculty_01',
      name: 'ajeet kumar',
      email: 'faculty@campus.edu',
      password_hash: passwordHash,
      role: 'faculty',
      department: 'Robotics & Intelligent Systems'
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
    } else {
      await dbRun(
        `UPDATE users SET name = ?, department = ?, role = ? WHERE email = ?`,
        [u.name, u.department, u.role, u.email]
      );
    }
  }

  // 2. Seed All Requested Resources across Sports, Seminar Halls, Labs & Equipment
  const resources = [
    // --- SECTION 1: SPORTS (Indoor & Outdoor) ---
    // Indoor Sports
    {
      id: 'res_sport_tt_01',
      name: 'Indoor Table Tennis Arena',
      category: 'Sports',
      location: 'Indoor Sports Complex, Court 1',
      capacity: 8,
      description: 'Championship ITTF-approved indoor table tennis tables with anti-glare illumination and non-slip sports flooring.',
      image_url: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['2x ITTF Tournament Tables', 'DHS Poly-Ball Pack', 'Retractable Tension Nets', 'Gum-Sole Traction Flooring']),
      rules: JSON.stringify(['Non-marking sports shoes only', 'Bring your own paddles or check out at desk', 'Clean table tops with dry cloth after play']),
      status: 'available'
    },
    {
      id: 'res_sport_badminton_01',
      name: 'Indoor Badminton Arena',
      category: 'Sports',
      location: 'Indoor Sports Complex, Hall B',
      capacity: 16,
      description: 'BWF-standard synthetic indoor badminton court with professional net tensioning, high-bay LED lighting, and spectator bleachers.',
      image_url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['BWF Certified Mat Flooring', 'Yonex Tournament Net Rig', 'LED Anti-Glare High-Bays', 'Changing Rooms & Showers']),
      rules: JSON.stringify(['Strictly non-marking shoes required', 'Maximum 4 players per active court', 'Booking limit: 2 hours per session']),
      status: 'available'
    },
    {
      id: 'res_sport_chess_01',
      name: 'Campus Chess & Mind Sports Lounge',
      category: 'Sports',
      location: 'Student Activity Center, Room 204',
      capacity: 24,
      description: 'Dedicated quiet tournament space with FIDE standard wooden chess boards, DGT digital clocks, and study analysis tables.',
      image_url: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['12x FIDE Tournament Chess Sets', 'DGT 2010 Digital Chess Clocks', 'Silent Study & Analysis Zone', 'Air-Conditioned Acoustic Lounge']),
      rules: JSON.stringify(['Maintain tournament silence', 'Reset pieces and clocks after games', 'No food or uncovered beverages']),
      status: 'available'
    },
    {
      id: 'res_sport_carrom_01',
      name: 'Carrom & Board Games Lounge',
      category: 'Sports',
      location: 'Student Activity Center, Room 205',
      capacity: 20,
      description: 'Premium English birchwood championship carrom boards with precise acrylic tournament strikers, carrom powder, and dedicated lamps.',
      image_url: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['6x Precise Championship Carrom Boards', 'Specialized LED Board Lamps', 'Tournament Strikers & Coin Sets', 'Boric Powder Dispensers']),
      rules: JSON.stringify(['Use only provided boric powder', 'Handle striker coins with care', 'Wipe down surface after use']),
      status: 'available'
    },
    {
      id: 'res_sport_kabaddi_01',
      name: 'Indoor Kabaddi Mat Arena',
      category: 'Sports',
      location: 'Indoor Sports Complex, Arena Mat 1',
      capacity: 30,
      description: 'Pro-Kabaddi standard inter-locking EVA foam high-density cushioned mat arena with digital electronic scoring console and first-aid facility.',
      image_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Pro-Kabaddi 40mm EVA Foam Mats', 'Digital Raid-Clock & Score Console', 'Padded Safety Perimeter', 'First-Aid & Ice Station']),
      rules: JSON.stringify(['Barefoot or kabaddi shoes only', 'Proper sports attire mandatory', 'Warm up before full-contact drills']),
      status: 'available'
    },
    // Outdoor Sports
    {
      id: 'res_sport_basketball_01',
      name: 'Outdoor Championship Basketball Court',
      category: 'Sports',
      location: 'Outdoor Athletics Ground, North Wing',
      capacity: 30,
      description: 'Full-size acrylic synthetic all-weather basketball court with spring-loaded breakaway rims, tempered glass backboards, and stadium floodlights.',
      image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['FIBA Regulation Size Court', 'Spalding Breakaway Tempered Rims', '1000W LED Night Floodlights', 'Perimeter Player Benches']),
      rules: JSON.stringify(['No metal spikes or cleats', 'Turn off floodlights if last to leave', 'Report any equipment damage to security']),
      status: 'available'
    },
    {
      id: 'res_sport_cricket_01',
      name: 'Campus Cricket Ground & Practice Nets',
      category: 'Sports',
      location: 'Main University Sports Ground',
      capacity: 40,
      description: 'Full-size natural grass cricket oval featuring 4 enclosed synthetic turf practice nets, bowling machine setup, and digital boundary scoreboard.',
      image_url: 'https://images.unsplash.com/photo-1531415074868-036b1c575351?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['4x Turf Cricket Practice Nets', 'Programmable Bola Bowling Machine', 'Natural Turf Main Pitch', 'Spectator Pavilion Access']),
      rules: JSON.stringify(['Full protective gear mandatory in nets', 'Only leather/cork cricket balls allowed on turf', 'Book pitch 24 hours prior for matches']),
      status: 'available'
    },
    {
      id: 'res_sport_volleyball_01',
      name: 'Outdoor Volleyball Court',
      category: 'Sports',
      location: 'Outdoor Athletics Ground, South Wing',
      capacity: 24,
      description: 'High-traction outdoor volleyball court equipped with heavy-duty steel posts, tournament-grade net tensioners, and night lighting.',
      image_url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['High-Tension Tournament Net', 'Shock-Absorbing Court Surface', 'Night Floodlight System', 'Referee Chair & Score Display']),
      rules: JSON.stringify(['Standard athletic footwear only', 'Do not hang on or pull the nets', 'Keep court clear of litter']),
      status: 'available'
    },

    // --- SECTION 2: SEMINAR HALLS & AUDITORIUMS ---
    {
      id: 'res_auditorium_01',
      name: 'Grand University Auditorium',
      category: 'Seminar Halls',
      location: 'Central Academic Block, Ground Floor',
      capacity: 400, // Exactly 400 as requested
      description: 'Flagship 400-seat multi-tier university auditorium equipped with 4K laser projection, Dolby acoustic line-array audio, broadcast video rigs, and stage green rooms.',
      image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['400 Velvet Tiered Seats', '4K Christie Laser Projector', 'Dolby Atmos Surround System', 'AV Control Booth & Multi-Cam Rig', 'Stage Green Room Access']),
      rules: JSON.stringify(['Prior AV briefing required', 'Emergency exits must remain clear', 'No open food or drinks inside auditorium']),
      status: 'available'
    },
    {
      id: 'res_seminar_01',
      name: 'Executive Seminar Hall 1',
      category: 'Seminar Halls',
      location: 'Science & Innovation Complex, 2nd Floor',
      capacity: 60, // Exactly 60 as requested
      description: 'Interactive presentation room with an 85-inch 4K touchscreen, ceiling beamforming microphones for hybrid Zoom/Teams conferences, and plush seating for 60.',
      image_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['60 Plush Ergonomic Seats', '85-inch Interactive Smart Display', 'Shure Ceiling Mic Array', 'Hybrid Video Rig', 'Podium with HDMI/Type-C']),
      rules: JSON.stringify(['Wipe smart display with provided cloth', 'Return wireless mics to charging dock', 'Keep acoustic partitions closed']),
      status: 'available'
    },
    {
      id: 'res_seminar_02',
      name: 'Executive Seminar Hall 2',
      category: 'Seminar Halls',
      location: 'Science & Innovation Complex, 3rd Floor',
      capacity: 60, // Exactly 60 as requested
      description: 'Modern conference and seminar venue featuring dual laser presentation monitors, motorized shades, tiered executive seating for 60, and presenter stage.',
      image_url: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['60 Executive Conference Seats', 'Dual Laser Presentation Displays', 'Wireless Presenter Clickers', 'Acoustic Soundproofing Paneling']),
      rules: JSON.stringify(['Leave hall in tidy condition', 'Mute audio systems upon leaving', 'Book at least 12 hours in advance']),
      status: 'available'
    },

    // --- SECTION 3: LABS (6 Labs) ---
    {
      id: 'res_lab_computer_01',
      name: 'Advanced Computer Science & AI Lab',
      category: 'Labs',
      location: 'Tech Tower, Room 301',
      capacity: 50,
      description: 'High-performance computing laboratory with 50 high-spec developer workstations, NVIDIA RTX GPU nodes, gigabit fiber network, and dual 4K monitors.',
      image_url: 'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['50x Core-i9 Workstations with RTX GPUs', 'Gigabit Dedicated Fiber Uplink', 'Air-Conditioned Cleanroom', 'Dual 4K Instructor Displays', 'Linux & Windows Dual Boot']),
      rules: JSON.stringify(['Authorized CS/AI students only', 'Save all files to network drive before exit', 'No food or uncovered beverages']),
      status: 'available'
    },
    {
      id: 'res_lab_chemistry_01',
      name: 'Applied Chemistry & Synthesis Lab',
      category: 'Labs',
      location: 'Science Block, Room 102',
      capacity: 40,
      description: 'Modern chemical laboratory with ducted fume hoods, digital analytical balances, UV-Vis spectrophotometers, glass distillation rigs, and safety eye-wash stations.',
      image_url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['4x Ducted Fume Extraction Hoods', 'Shimadzu UV-Vis Spectrophotometer', 'Mettler Toledo Precision Balances', 'Emergency Chemical Eye-Wash & Shower']),
      rules: JSON.stringify(['Lab coats and safety goggles mandatory', 'Dispose chemical waste in designated carboys', 'Never leave heating mantles unattended']),
      status: 'available'
    },
    {
      id: 'res_lab_physics_01',
      name: 'Experimental Physics & Optics Lab',
      category: 'Labs',
      location: 'Science Block, Room 204',
      capacity: 40,
      description: 'Experimental laboratory equipped with vibration-isolated optical laser tables, spectrometers, Michelson interferometers, Hall effect apparatus, and darkroom stations.',
      image_url: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Vibration-Isolated Optical Tables', 'He-Ne Laser Benches & Interferometers', 'Digital Spectrometers', 'Darkroom Enclosure for Photometry']),
      rules: JSON.stringify(['Laser safety eyewear required in optics zone', 'Do not touch optical mirror surfaces directly', 'Power off high-voltage supplies when finished']),
      status: 'available'
    },
    {
      id: 'res_lab_english_01',
      name: 'English & Professional Communication Lab',
      category: 'Labs',
      location: 'Humanities & Language Wing, Room 110',
      capacity: 45,
      description: 'Audio-visual language training center with 45 multimedia workstations, active noise-canceling headsets, phonetics training modules, and group interview room.',
      image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['45x Multimedia Workstations', 'Sennheiser Noise-Canceling Headsets', 'Sanako Digital Language Lab Software', 'Group Discussion & Interview Simulation Bay']),
      rules: JSON.stringify(['Sanitize headsets before and after use', 'Keep volume at recommended decibel levels', 'Respect scheduled group sessions']),
      status: 'available'
    },
    {
      id: 'res_lab_beee_01',
      name: 'Basic Electrical & Electronics Engineering (BEEE) Lab',
      category: 'Labs',
      location: 'Engineering Block, Room 105',
      capacity: 45,
      description: 'Hands-on circuit prototyping lab with digital storage oscilloscopes, function generators, dual-tracking DC power supplies, LCR meters, and soldering benches.',
      image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Keysight 100MHz Digital Oscilloscopes', 'Rigol Arbitrary Function Generators', 'Weller Soldering & Desoldering Stations', 'Component Breadboard Stations']),
      rules: JSON.stringify(['Turn off power supplies before modifying wiring', 'Unplug soldering irons when leaving station', 'Wear safety glasses during soldering']),
      status: 'available'
    },
    {
      id: 'res_lab_3dprint_01',
      name: '3D Additive Manufacturing & Rapid Prototyping Lab',
      category: 'Labs',
      location: 'Makerspace Innovation Hub, Bay 2',
      capacity: 25,
      description: 'Industrial additive fabrication lab with multi-color FDM printers, SLA precision resin printers, 3D laser scanners, laser cutting, and ultrasonic cleaning baths.',
      image_url: 'https://images.unsplash.com/photo-1631553127988-34863f69e6b5?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['4x Bambu Lab X1-Carbon AMS Printers', 'Formlabs Form 3+ SLA Resin Unit', 'Formlabs Wash & UV Cure Chamber', 'Shining3D Handheld 3D Laser Scanner']),
      rules: JSON.stringify(['Complete slicing tutorial before operating printers', 'Wear nitrile gloves when handling uncured photopolymer resin', 'Keep fume ventilation active']),
      status: 'available'
    },

    // --- SECTION 4: EQUIPMENT (2 Categories) ---
    {
      id: 'res_equip_sports_01',
      name: 'Sports Equipment & Gear Kit Depot',
      category: 'Equipment',
      location: 'Campus Recreation Equipment Desk',
      capacity: 15,
      description: 'Checkout desk for official sports equipment kits including SG cricket sets, Spalding basketballs, Yonex badminton rackets, ITTF TT paddles, and volleyballs.',
      image_url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Complete SG Cricket Kits (Pads, Bats, Gloves)', 'Spalding Official Basketballs & Footballs', 'Yonex Nanoflare Rackets & Feather Shuttles', 'Mikasa Tournament Volleyballs']),
      rules: JSON.stringify(['Valid student ID card required for issue', 'Return all equipment in clean, undamaged condition', 'Late return incurs fine']),
      status: 'available'
    },
    {
      id: 'res_equip_library_01',
      name: 'Library Reference & Academic Books Archive',
      category: 'Equipment',
      location: 'Central University Library, 1st Floor',
      capacity: 20,
      description: 'Reserve dedicated reference textbook sets, rare academic research collections, Kindle Paperwhite research e-readers, and historical journal archives.',
      image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80',
      amenities: JSON.stringify(['Reserved Academic Reference Volumes', 'Kindle Paperwhite Digital E-Readers', 'IEEE & Springer Journal Archive Access', 'High-Speed Book Overhead Scanner']),
      rules: JSON.stringify(['Reference books must not be taken outside library premises', 'Handle historical archive folios with provided cotton gloves', 'Maximum reservation 4 hours per title']),
      status: 'available'
    }
  ];

  // Purge any obsolete previous facilities/slots from the database
  const validIdsList = resources.map((r) => `'${r.id}'`).join(',');
  await dbRun(`DELETE FROM bookings WHERE resource_id NOT IN (${validIdsList})`);
  await dbRun(`DELETE FROM resources WHERE id NOT IN (${validIdsList})`);

  for (const r of resources) {
    const existing = await dbGet('SELECT id FROM resources WHERE id = ?', [r.id]);
    if (!existing) {
      await dbRun(
        `INSERT INTO resources (id, name, category, location, capacity, description, image_url, amenities, rules, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.category, r.location, r.capacity, r.description, r.image_url, r.amenities, r.rules, r.status]
      );
    } else {
      await dbRun(
        `UPDATE resources SET name = ?, category = ?, location = ?, capacity = ?, description = ?, image_url = ?, amenities = ?, rules = ?, status = ? WHERE id = ?`,
        [r.name, r.category, r.location, r.capacity, r.description, r.image_url, r.amenities, r.rules, r.status, r.id]
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
      resource_id: 'res_lab_computer_01',
      title: 'Deep Learning Model Training — LLM Fine-Tuning',
      purpose: 'Training neural network weights for Final Year AI Capstone Project.',
      start_time: new Date(y, m, d, 9, 0).toISOString(),
      end_time: new Date(y, m, d, 11, 0).toISOString(),
      status: 'checked-in',
      qr_code_token: 'RH-COMPLAB-001'
    },
    {
      id: 'bk_002',
      user_id: 'usr_faculty_01',
      resource_id: 'res_auditorium_01',
      title: 'University Convocation & Tech Summit Keynote',
      purpose: 'Annual keynote address by distinguished alumni and faculty.',
      start_time: new Date(y, m, d, 14, 0).toISOString(),
      end_time: new Date(y, m, d, 16, 30).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-AUDIT-002'
    },
    {
      id: 'bk_003',
      user_id: 'usr_student_01',
      resource_id: 'res_sport_badminton_01',
      title: 'Inter-Department Badminton Doubles Championship',
      purpose: 'Practice session for university tournament.',
      start_time: new Date(y, m, d + 1, 10, 0).toISOString(),
      end_time: new Date(y, m, d + 1, 12, 0).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-BADMINTON-003'
    },
    {
      id: 'bk_004',
      user_id: 'usr_faculty_01',
      resource_id: 'res_lab_3dprint_01',
      title: 'Biomimetic Wing Structure Rapid Fabrication',
      purpose: 'Printing lightweight carbon-fiber PLA airfoils for wind tunnel test.',
      start_time: new Date(y, m, d, 13, 0).toISOString(),
      end_time: new Date(y, m, d, 15, 0).toISOString(),
      status: 'upcoming',
      qr_code_token: 'RH-3DPRINT-004'
    },
    {
      id: 'bk_005',
      user_id: 'usr_student_01',
      resource_id: 'res_sport_basketball_01',
      title: 'Inter-College Basketball Friendly Match',
      purpose: 'Weekend match with Engineering faculty.',
      start_time: new Date(y, m, d - 1, 16, 0).toISOString(),
      end_time: new Date(y, m, d - 1, 18, 0).toISOString(),
      status: 'completed',
      qr_code_token: 'RH-BBALL-005'
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
    } else {
      await dbRun(
        `UPDATE bookings SET user_id = ?, resource_id = ?, title = ?, purpose = ?, start_time = ?, end_time = ?, status = ?, qr_code_token = ? WHERE id = ?`,
        [b.user_id, b.resource_id, b.title, b.purpose, b.start_time, b.end_time, b.status, b.qr_code_token, b.id]
      );
    }
  }

  // 4. Seed Notifications
  const sampleNotifications = [
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      booking_id: 'bk_001',
      title: 'Reservation Confirmed',
      message: 'Your reservation for "Advanced Computer Science & AI Lab" is confirmed.',
      type: 'confirmation',
      is_read: 0,
      created_at: new Date(today.getTime() - 20 * 60000).toISOString()
    },
    {
      id: uuidv4(),
      user_id: 'usr_student_01',
      booking_id: 'bk_001',
      title: 'Upcoming Session Reminder',
      message: 'Your lab session starts in 10 minutes at Tech Tower, Room 301. Scan your digital QR pass at the entrance.',
      type: 'reminder',
      is_read: 0,
      created_at: new Date(today.getTime() - 5 * 60000).toISOString()
    },
    {
      id: uuidv4(),
      user_id: 'usr_faculty_01',
      booking_id: 'bk_002',
      title: 'Auditorium Booking Confirmed',
      message: 'Grand University Auditorium reserved for Tech Summit Keynote (400 Seats).',
      type: 'confirmation',
      is_read: 0,
      created_at: new Date(today.getTime() - 60 * 60000).toISOString()
    }
  ];

  for (const n of sampleNotifications) {
    const existing = await dbGet('SELECT id FROM notifications WHERE user_id = ? AND title = ?', [n.user_id, n.title]);
    if (!existing) {
      await dbRun(
        `INSERT INTO notifications (id, user_id, booking_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.user_id, n.booking_id, n.title, n.message, n.type, n.is_read, n.created_at]
      );
    }
  }

  // Persist disk cache
  await persistToDisk();
  console.log('Database successfully seeded with all requested facilities, sports arenas, labs, and equipment!');
};

if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = seedData;
