/* ===================================
   CHAPTER DETAILS DYNAMIC CONTENT
   File: assets/js/chapter-details.js
=================================== */

// Chapter Data
const chaptersData = {
  'student-branch': {
    title: 'IEEE TTU Student Branch',
    tagline: 'Building tomorrow\'s engineers today',
    logo: '../assets/img/IEEE_TTU_Logo.png',
    about: 'Our Student Branch serves as the central hub for all IEEE activities at Tafila Technical University. We connect students with opportunities to develop technical skills, build professional networks, and make lasting contributions to the engineering community through diverse programs, workshops, and collaborative projects.',
    mission: 'Empowering students through technical excellence and professional development',
    community: 'Building a diverse network of passionate engineers and innovators',
    innovation: 'Fostering creativity and cutting-edge technical projects',
    activities: [
      {
        icon: '💻',
        title: 'Technical Workshops',
        description: 'Hands-on sessions covering programming, electronics, and emerging technologies'
      },
      {
        icon: '🏆',
        title: 'Competitions',
        description: 'Local and international hackathons, coding challenges, and innovation contests'
      },
      {
        icon: '🎓',
        title: 'Training Programs',
        description: 'Professional development courses and certification preparation'
      },
      {
        icon: '🤝',
        title: 'Networking Events',
        description: 'Industry meetups, guest speakers, and career fair participation'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🏆 Best Student Branch Award',
        description: 'Recognized by IEEE Jordan Section for outstanding activities and member engagement'
      },
      {
        year: '2024',
        title: '🥇 First Place - National Hackathon',
        description: 'Won regional programming competition with innovative AI solution'
      },
      {
        year: '2024',
        title: '⭐ 87+ Active Members Milestone',
        description: 'Reached significant growth in student participation and engagement'
      }
    ]
  },
  
  'computer-society': {
    title: 'Computer Society',
    tagline: 'Advancing the theory and practice of computing',
    logo: '../assets/img/societies/cs-logo.png',
    about: 'The IEEE Computer Society is dedicated to advancing computing technology and its applications. We organize workshops, hackathons, and training sessions focused on software development, artificial intelligence, cybersecurity, and emerging technologies. Our community brings together students passionate about innovation in computing.',
    mission: 'Leading the advancement of computer science and technology',
    community: 'Connecting developers, programmers, and tech enthusiasts',
    innovation: 'Exploring AI, machine learning, and cutting-edge software solutions',
    activities: [
      {
        icon: '💻',
        title: 'Coding Bootcamps',
        description: 'Intensive training in Python, Java, C++, and web development frameworks'
      },
      {
        icon: '🤖',
        title: 'AI/ML Workshops',
        description: 'Practical sessions on machine learning, deep learning, and data science'
      },
      {
        icon: '🔒',
        title: 'Cybersecurity Training',
        description: 'Ethical hacking, network security, and privacy protection courses'
      },
      {
        icon: '🏅',
        title: 'Programming Contests',
        description: 'Regular coding challenges and participation in international competitions'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🥇 ACM Programming Contest - Regional Winners',
        description: 'Top team in Jordan regional programming competition'
      },
      {
        year: '2024',
        title: '🚀 AI Hackathon Champions',
        description: 'First place in national AI innovation challenge'
      },
      {
        year: '2024',
        title: '📚 50+ Technical Workshops Conducted',
        description: 'Trained over 200 students in various programming languages and frameworks'
      }
    ]
  },
  
  'ras': {
    title: 'Robotics & Automation Society',
    tagline: 'Innovating in robotics and intelligent systems',
    logo: '../assets/img/societies/ras-logo.png',
    about: 'IEEE RAS focuses on the theory and application of robotics, automation, and intelligent systems. We provide hands-on experience with robot design, autonomous systems, IoT devices, and automation technologies through projects, competitions, and collaborative research.',
    mission: 'Advancing robotics and automation for a smarter future',
    community: 'United makers, builders, and robotics enthusiasts',
    innovation: 'Creating intelligent systems and autonomous solutions',
    activities: [
      {
        icon: '🤖',
        title: 'Robot Building Workshops',
        description: 'Design and build autonomous robots from scratch'
      },
      {
        icon: '🌐',
        title: 'IoT Projects',
        description: 'Smart home automation and Internet of Things applications'
      },
      {
        icon: '🏆',
        title: 'Robotics Competitions',
        description: 'Participate in national and international robot contests'
      },
      {
        icon: '⚙️',
        title: 'Automation Training',
        description: 'Industrial automation, PLCs, and control systems'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🏆 National Robotics Competition - 2nd Place',
        description: 'Outstanding performance in autonomous navigation challenge'
      },
      {
        year: '2024',
        title: '🤖 Built 5 Functional Robots',
        description: 'Line-following, obstacle-avoiding, and pick-and-place robots'
      },
      {
        year: '2024',
        title: '🌟 IoT Innovation Award',
        description: 'Recognized for smart campus automation project'
      }
    ]
  },
  
  'pes': {
    title: 'Power & Energy Society',
    tagline: 'Powering a sustainable future',
    logo: '../assets/img/societies/pes-logo.png',
    about: 'IEEE PES is dedicated to advancing sustainable energy solutions, power systems, and renewable energy technologies. We focus on smart grids, solar energy, wind power, and energy management systems to contribute to a greener and more efficient energy future.',
    mission: 'Leading the transition to sustainable energy systems',
    community: 'Energy engineers committed to environmental sustainability',
    innovation: 'Developing renewable energy and smart grid technologies',
    activities: [
      {
        icon: '☀️',
        title: 'Solar Energy Projects',
        description: 'Design and installation of photovoltaic systems'
      },
      {
        icon: '⚡',
        title: 'Power Systems Training',
        description: 'Study of electrical grids, transmission, and distribution'
      },
      {
        icon: '🔋',
        title: 'Energy Storage Solutions',
        description: 'Battery technologies and energy management systems'
      },
      {
        icon: '🌱',
        title: 'Sustainability Workshops',
        description: 'Green energy initiatives and environmental impact studies'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🌞 Solar Panel Installation',
        description: 'Successfully installed 10kW solar system on campus building'
      },
      {
        year: '2024',
        title: '⚡ Smart Grid Research Project',
        description: 'Published paper on distributed energy resources optimization'
      },
      {
        year: '2024',
        title: '🏅 Energy Efficiency Challenge Winner',
        description: 'First place in national renewable energy competition'
      }
    ]
  },
  
  'wie': {
    title: 'Women in Engineering',
    tagline: 'Inspiring, engaging, and advancing women in technology',
    logo: '../assets/img/societies/wie-logo.png',
    about: 'IEEE WIE is committed to facilitating the recruitment and retention of women in technical disciplines globally. We promote women engineers and scientists, and inspire girls around the world to follow their academic interests in engineering through mentorship, networking, and professional development.',
    mission: 'Empowering women to achieve their full potential in engineering',
    community: 'Supporting and connecting women engineers worldwide',
    innovation: 'Breaking barriers and leading change in STEM fields',
    activities: [
      {
        icon: '👩‍💻',
        title: 'Mentorship Programs',
        description: 'One-on-one guidance from experienced women engineers'
      },
      {
        icon: '🎤',
        title: 'Leadership Workshops',
        description: 'Developing communication, leadership, and professional skills'
      },
      {
        icon: '🤝',
        title: 'Networking Events',
        description: 'Connect with industry leaders and role models'
      },
      {
        icon: '🌟',
        title: 'Outreach Programs',
        description: 'Inspiring young girls to pursue STEM careers'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '👩 Mentored 30+ Women Engineers',
        description: 'Successful mentorship program connecting students with professionals'
      },
      {
        year: '2024',
        title: '🎓 Leadership Conference',
        description: 'Organized regional WIE leadership summit with 100+ participants'
      },
      {
        year: '2024',
        title: '🌟 Community Outreach',
        description: 'Reached 200+ school girls through STEM awareness programs'
      }
    ]
  },
  
  'embs': {
    title: 'Engineering in Medicine & Biology Society',
    tagline: 'Advancing healthcare through engineering innovation',
    logo: '../assets/img/societies/embs-logo.png',
    about: 'IEEE EMBS bridges engineering and medicine to develop innovative healthcare solutions. We focus on biomedical devices, health informatics, medical imaging, and biotechnology to improve patient care and medical diagnostics through technology.',
    mission: 'Innovating at the intersection of engineering and healthcare',
    community: 'Biomedical engineers dedicated to improving human health',
    innovation: 'Developing next-generation medical devices and health tech',
    activities: [
      {
        icon: '🏥',
        title: 'Medical Device Design',
        description: 'Prototyping diagnostic and therapeutic medical equipment'
      },
      {
        icon: '🧬',
        title: 'Biotech Workshops',
        description: 'Genetic engineering, biosensors, and lab techniques'
      },
      {
        icon: '💓',
        title: 'Health Monitoring Systems',
        description: 'Wearable devices and patient monitoring technologies'
      },
      {
        icon: '🔬',
        title: 'Research Projects',
        description: 'Collaborative biomedical research and innovation'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🏆 Biomedical Innovation Award',
        description: 'Low-cost ventilator design recognized at national competition'
      },
      {
        year: '2024',
        title: '💡 Health Tech Hackathon Winner',
        description: 'AI-powered disease diagnosis system'
      },
      {
        year: '2024',
        title: '🔬 Research Publication',
        description: 'Paper accepted in international biomedical engineering journal'
      }
    ]
  },
  
  'sight': {
    title: 'Special Interest Group on Humanitarian Technology',
    tagline: 'Technology serving humanity',
    logo: '../assets/img/societies/sight-logo.png',
    about: 'IEEE SIGHT leverages technology to address humanitarian challenges and promote sustainable development. We focus on community service projects, social impact initiatives, and technology solutions for underserved communities.',
    mission: 'Using technology to solve global humanitarian challenges',
    community: 'Engineers committed to social impact and sustainability',
    innovation: 'Creating solutions for sustainable development goals',
    activities: [
      {
        icon: '🌍',
        title: 'Community Projects',
        description: 'Technology solutions for local community challenges'
      },
      {
        icon: '♻️',
        title: 'Sustainability Initiatives',
        description: 'Environmental conservation and green technology projects'
      },
      {
        icon: '💡',
        title: 'Social Innovation',
        description: 'Addressing social issues through technological solutions'
      },
      {
        icon: '🤲',
        title: 'Volunteer Programs',
        description: 'Community service and humanitarian assistance projects'
      }
    ],
    achievements: [
      {
        year: '2025',
        title: '🌟 Clean Water Project',
        description: 'Implemented water purification system in rural community'
      },
      {
        year: '2024',
        title: '♻️ E-Waste Recycling Campaign',
        description: 'Collected and properly disposed 500kg of electronic waste'
      },
      {
        year: '2024',
        title: '🎓 Education Technology Initiative',
        description: 'Provided computers and internet access to underprivileged schools'
      }
    ]
  }
};

// Load Chapter Data on Page Load
document.addEventListener('DOMContentLoaded', function() {
  // Get chapter parameter from URL
  const urlParams = new URLSearchParams(window.location.search);
  const chapterId = urlParams.get('chapter') || 'student-branch';
  
  // Get chapter data
  const chapter = chaptersData[chapterId];
  
  if (chapter) {
    // Update page title
    document.title = `${chapter.title} - IEEE TTU Student Branch`;
    
    // Update hero section
    document.getElementById('heroLogo').src = chapter.logo;
    document.getElementById('chapterTitle').textContent = chapter.title;
    document.getElementById('chapterTagline').textContent = chapter.tagline;
    
    // Update about section
    document.getElementById('aboutText').textContent = chapter.about;
    
    // Update highlights (only if elements exist)
    const highlightCards = document.querySelectorAll('.highlight-card');
    if (highlightCards.length >= 3) {
      highlightCards[0].querySelector('p').textContent = chapter.mission;
      highlightCards[1].querySelector('p').textContent = chapter.community;
      highlightCards[2].querySelector('p').textContent = chapter.innovation;
    }
    
    // Update activities
    const activitiesGrid = document.getElementById('activitiesGrid');
    if (activitiesGrid && chapter.activities) {
      activitiesGrid.innerHTML = chapter.activities.map(activity => `
        <div class="activity-card">
          <div class="activity-icon">${activity.icon}</div>
          <h3>${activity.title}</h3>
          <p>${activity.description}</p>
        </div>
      `).join('');
    }
    
    // Update achievements
    const achievementsTimeline = document.getElementById('achievementsTimeline');
    if (achievementsTimeline && chapter.achievements) {
      achievementsTimeline.innerHTML = chapter.achievements.map(achievement => `
        <div class="achievement-item">
          <div class="achievement-year">${achievement.year}</div>
          <div class="achievement-content">
            <h3>${achievement.title}</h3>
            <p>${achievement.description}</p>
          </div>
        </div>
      `).join('');
    }
  }
  
  // Theme Toggle (if not in main.js)
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
});

// Smooth scroll for back button
document.addEventListener('click', function(e) {
  if (e.target.closest('.back-btn')) {
    e.preventDefault();
    window.location.href = 'chapters.html';
  }
});