'use strict';

var COURSE_DATA = (function () {

  function deepFreeze(o) {
    if (o === null || typeof o !== 'object') return o;
    Object.freeze(o);
    Object.getOwnPropertyNames(o).forEach(function (p) {
      var v = o[p];
      if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
    });
    return o;
  }

  var sharedObjectives = [
    "Understand foundational frameworks and industry-standard methodologies",
    "Apply practical techniques through real-world case studies and exercises",
    "Build professional deliverables and project artifacts from scratch",
    "Master essential tools and software used by HR, PMP, and IT professionals",
    "Develop critical thinking and problem-solving skills for workplace scenarios",
    "Prepare confidently for globally recognized professional certification exams"
  ];

  var sharedCurriculum = [
    {
      title: "Getting Started",
      lessons: [
        { title: "Course Introduction & Learning Roadmap", duration: "05:30", preview: true },
        { title: "Setting Up Your Study Environment",      duration: "12:00", preview: true },
        { title: "Understanding Key Terminology",          duration: "08:45", preview: false }
      ]
    },
    {
      title: "Core Concepts",
      lessons: [
        { title: "Fundamental Principles Explained",      duration: "15:20", preview: false },
        { title: "Working with Essential Frameworks",     duration: "18:00", preview: false },
        { title: "Practical Application Exercise",        duration: "22:10", preview: false },
        { title: "Common Mistakes and How to Avoid Them", duration: "10:30", preview: false }
      ]
    },
    {
      title: "Advanced Techniques",
      lessons: [
        { title: "Deep Dive into Advanced Strategies",  duration: "20:00", preview: false },
        { title: "Real-World Case Study",               duration: "25:15", preview: false },
        { title: "Performance Optimization Techniques",  duration: "14:40", preview: false }
      ]
    },
    {
      title: "Final Project & Wrap-Up",
      lessons: [
        { title: "Project Requirements & Planning", duration: "08:00", preview: false },
        { title: "Building the Final Project",      duration: "35:00", preview: false },
        { title: "Course Summary & Next Steps",     duration: "06:20", preview: true  }
      ]
    }
  ];

  var sharedFaq = [
    {
      question: "Do I need prior experience to take this course?",
      answer: "This depends on the course level. Beginner courses require no prior experience, while Intermediate and Advanced courses assume foundational knowledge in the subject area."
    },
    {
      question: "How long do I have access to the course materials?",
      answer: "Once purchased, you have lifetime access to all course materials including future updates and additions."
    },
    {
      question: "Is there a certificate upon completion?",
      answer: "Yes, you will receive a certificate of completion that you can share on your professional profiles and LinkedIn."
    },
    {
      question: "Can I get a refund if I'm not satisfied?",
      answer: "We offer a 30-day money-back guarantee. If you are not satisfied with the course, contact us via WhatsApp for a full refund."
    },
    {
      question: "How do I access the course after purchase?",
      answer: "After confirming your payment via WhatsApp, you will receive access credentials to use on the course page. You can then log in and start learning immediately."
    }
  ];

  var courses = [
    {
      id: 1,
      title: "HR Foundations — Talent Acquisition & People Management",
      category: "HR",
      level: "Beginner",
      price: 49.00,
      originalPrice: 99.00,
      students: 0,
      lessons: 1,
      rating: 0,
      date: "2025-11-10",
      language: "en",
      description: "Master the fundamentals of human resources management, from talent acquisition and onboarding to employee engagement and retention. This comprehensive course covers the entire HR lifecycle with practical frameworks, real-world templates, and actionable strategies that you can apply immediately in any organization.",
      image: "og-image.png",
      instructor: "WaslaTalent Team",
      tags: ["hr", "human resources", "talent acquisition", "recruitment", "onboarding", "employee engagement", "people management"],
      driveUrl: "",
      learningObjectives: [
        "Design an end-to-end talent acquisition process from job analysis to offer letter",
        "Build structured onboarding programs that accelerate new-hire productivity",
        "Create employee engagement surveys and interpret results for actionable insights",
        "Develop performance review frameworks aligned with organizational goals",
        "Navigate employment law essentials including contracts, termination, and compliance",
        "Implement retention strategies that reduce turnover and build a strong employer brand"
      ],
      curriculum: [
        {
          title: "Introduction to Modern HR",
          lessons: [
            { title: "The Evolving Role of HR in Organizations", duration: "08:00", preview: true },
            { title: "HR Strategy Alignment with Business Goals", duration: "12:00", preview: true },
            { title: "Key HR Metrics and KPIs", duration: "10:00", preview: false }
          ]
        },
        {
          title: "Talent Acquisition & Recruitment",
          lessons: [
            { title: "Job Analysis and Description Writing", duration: "14:00", preview: false },
            { title: "Sourcing Strategies — Active vs Passive Candidates", duration: "16:00", preview: false },
            { title: "Structured Interview Techniques", duration: "18:00", preview: false },
            { title: "Offer Negotiation and Candidate Experience", duration: "12:00", preview: false }
          ]
        },
        {
          title: "Onboarding & Employee Engagement",
          lessons: [
            { title: "Designing a 90-Day Onboarding Plan", duration: "15:00", preview: false },
            { title: "Engagement Surveys — Design, Deploy, Analyze", duration: "13:00", preview: false },
            { title: "Recognition Programs and Retention Tactics", duration: "11:00", preview: false }
          ]
        },
        {
          title: "Performance Management & Compliance",
          lessons: [
            { title: "Building a Performance Review Framework", duration: "14:00", preview: false },
            { title: "Employment Law Essentials for HR Professionals", duration: "16:00", preview: false },
            { title: "HR Documentation Best Practices", duration: "10:00", preview: false }
          ]
        }
      ],
      faq: [
        {
          question: "Who is this course designed for?",
          answer: "This course is ideal for aspiring HR professionals, small business owners handling their own HR, team leads transitioning into people management roles, and anyone preparing for an HR career change."
        },
        {
          question: "Do I need an HR background to enroll?",
          answer: "No prior HR experience is required. The course starts with foundational concepts and builds progressively. Each module includes practical exercises so you learn by doing."
        },
        {
          question: "Will this help me prepare for SHRM or HRCI certification?",
          answer: "While this is not a dedicated certification prep course, it covers many foundational topics that overlap with SHRM-CP and PHR exam domains. It provides an excellent knowledge base before you start formal certification study."
        },
        {
          question: "Are the templates and frameworks included for download?",
          answer: "Yes. You receive downloadable templates for job descriptions, interview scorecards, onboarding checklists, performance review forms, and engagement survey questionnaires."
        },
        {
          question: "How long will it take to complete the course?",
          answer: "The total video content is approximately 3 hours. Most students complete the course within 1–2 weeks when studying at a comfortable pace alongside the practical exercises."
        }
      ]
    },
    {
      id: 2,
      title: "PMP Exam Prep — PMBOK 7th Edition Complete Guide",
      category: "PMP / Project Management",
      level: "Intermediate",
      price: 149.00,
      originalPrice: 249.00,
      students: 0,
      lessons: 1,
      rating: 0,
      date: "2025-12-05",
      language: "en",
      description: "Prepare to pass the PMP certification exam on your first attempt. This comprehensive course covers all PMBOK 7th Edition principles, performance domains, and the new exam format with predictive, agile, and hybrid approaches. Includes 500+ practice questions, full-length mock exams, and proven study strategies from certified PMP instructors.",
      image: "og-image.png",
      instructor: "WaslaTalent Team",
      tags: ["pmp", "project management", "pmbok", "certification", "agile", "waterfall", "hybrid", "pmi"],
      driveUrl: "",
      learningObjectives: [
        "Master all 12 PMBOK 7th Edition principles and 8 performance domains",
        "Understand predictive, agile, and hybrid project management approaches",
        "Apply earned value management, risk analysis, and scheduling techniques",
        "Navigate stakeholder engagement, team leadership, and conflict resolution",
        "Complete full-length mock exams simulating the real PMP exam environment",
        "Develop a personalized 6-week study plan for exam-day readiness"
      ],
      curriculum: [
        {
          title: "PMP Exam Overview & Study Strategy",
          lessons: [
            { title: "PMP Exam Format — Structure, Timing, and Scoring", duration: "10:00", preview: true },
            { title: "PMBOK 7th Edition — What Changed and Why It Matters", duration: "14:00", preview: true },
            { title: "Building Your Personalized Study Plan", duration: "08:00", preview: false }
          ]
        },
        {
          title: "Project Management Principles",
          lessons: [
            { title: "Stewardship, Team, and Stakeholder Principles", duration: "18:00", preview: false },
            { title: "Value, Systems Thinking, and Complexity", duration: "16:00", preview: false },
            { title: "Risk, Adaptability, and Quality Principles", duration: "15:00", preview: false },
            { title: "Leadership, Tailoring, and Change Principles", duration: "14:00", preview: false }
          ]
        },
        {
          title: "Performance Domains Deep Dive",
          lessons: [
            { title: "Stakeholder and Team Performance Domains", duration: "20:00", preview: false },
            { title: "Development Approach and Life Cycle Planning", duration: "18:00", preview: false },
            { title: "Project Work and Delivery Domains", duration: "22:00", preview: false },
            { title: "Measurement and Uncertainty Domains", duration: "16:00", preview: false }
          ]
        },
        {
          title: "Predictive, Agile & Hybrid Approaches",
          lessons: [
            { title: "Waterfall — Planning, Execution, and Control", duration: "15:00", preview: false },
            { title: "Agile Fundamentals — Scrum, Kanban, and XP", duration: "20:00", preview: false },
            { title: "Hybrid Approaches — When and How to Blend", duration: "14:00", preview: false }
          ]
        },
        {
          title: "Exam Simulation & Final Review",
          lessons: [
            { title: "Mock Exam 1 — Full-Length Simulation (180 Questions)", duration: "30:00", preview: false },
            { title: "Mock Exam Review — Detailed Answer Explanations", duration: "25:00", preview: false },
            { title: "Last-Week Revision Strategy and Exam-Day Tips", duration: "10:00", preview: false }
          ]
        }
      ],
      faq: [
        {
          question: "Is this course aligned with the current PMP exam?",
          answer: "Yes. The course is fully aligned with the PMP Examination Content Outline (ECO) effective from January 2021 and the PMBOK Guide 7th Edition. It covers predictive (50%), agile (50%), and hybrid approaches as weighted in the actual exam."
        },
        {
          question: "How many practice questions are included?",
          answer: "The course includes over 500 practice questions across chapter quizzes, topic-specific drills, and 2 full-length mock exams of 180 questions each, designed to mirror the real exam experience."
        },
        {
          question: "Do I need project management experience to enroll?",
          answer: "This is an Intermediate-level course designed for professionals who have some project management exposure. PMI requires 36 months of project management experience (or 60 months without a degree) to sit for the PMP exam. This course prepares you for the exam itself."
        },
        {
          question: "Does this course provide the 35 contact hours required by PMI?",
          answer: "The total course content exceeds 35 hours when you include the practice exams, quizzes, and supplemental study materials. A completion certificate documenting your study hours is provided."
        },
        {
          question: "What is the pass rate for students who complete this course?",
          answer: "Students who complete all modules, practice exams, and follow the recommended study plan report a first-attempt pass rate significantly above the global average. Results depend on individual effort and preparation."
        }
      ]
    },
    {
      id: 3,
      title: "CompTIA A+ Essentials — IT Support & Troubleshooting",
      category: "IT / Technical",
      level: "Beginner",
      price: 79.00,
      students: 0,
      lessons: 1,
      rating: 0,
      date: "2026-01-15",
      language: "en",
      description: "Build a solid foundation in IT support with this hands-on course covering hardware, software, networking, security, and troubleshooting. Aligned with CompTIA A+ Core 1 (220-1101) objectives, this course prepares you for a career in IT help desk, desktop support, and field service technician roles with practical labs and real-world scenarios.",
      image: "og-image.png",
      instructor: "WaslaTalent Team",
      tags: ["comptia", "a+", "it support", "troubleshooting", "hardware", "networking", "help desk", "certification"],
      driveUrl: "",
      learningObjectives: [
        "Identify and troubleshoot common hardware components including CPUs, RAM, and storage devices",
        "Configure and manage Windows, macOS, and Linux operating systems",
        "Set up and troubleshoot TCP/IP networking, Wi-Fi, and basic network services",
        "Implement security best practices including malware prevention and physical security",
        "Apply structured troubleshooting methodology to diagnose and resolve technical issues",
        "Prepare for the CompTIA A+ Core 1 (220-1101) certification exam"
      ],
      curriculum: [
        {
          title: "Introduction to IT Support",
          lessons: [
            { title: "The IT Support Career Path — Roles and Opportunities", duration: "07:00", preview: true },
            { title: "CompTIA A+ Exam Overview and Study Tips", duration: "09:00", preview: true },
            { title: "Setting Up Your Home Lab Environment", duration: "12:00", preview: false }
          ]
        },
        {
          title: "Hardware Fundamentals",
          lessons: [
            { title: "CPUs, RAM, and Motherboard Architecture", duration: "18:00", preview: false },
            { title: "Storage Technologies — HDD, SSD, NVMe, and RAID", duration: "15:00", preview: false },
            { title: "Peripheral Devices, Connectors, and Cables", duration: "12:00", preview: false },
            { title: "Troubleshooting Hardware Failures — Step by Step", duration: "16:00", preview: false }
          ]
        },
        {
          title: "Operating Systems & Software",
          lessons: [
            { title: "Windows Installation, Configuration, and Management", duration: "20:00", preview: false },
            { title: "macOS and Linux Essentials for IT Support", duration: "14:00", preview: false },
            { title: "Software Troubleshooting and Application Management", duration: "13:00", preview: false }
          ]
        },
        {
          title: "Networking & Security Basics",
          lessons: [
            { title: "TCP/IP, DNS, DHCP — Networking Essentials", duration: "18:00", preview: false },
            { title: "Wi-Fi Setup and Wireless Troubleshooting", duration: "12:00", preview: false },
            { title: "Security Threats, Malware Prevention, and Best Practices", duration: "15:00", preview: false },
            { title: "Practice Lab — Diagnosing Network and Security Issues", duration: "20:00", preview: false }
          ]
        }
      ],
      faq: [
        {
          question: "Is this course enough to pass the CompTIA A+ exam?",
          answer: "This course covers all Core 1 (220-1101) exam objectives thoroughly. For full A+ certification, you will also need to prepare for Core 2 (220-1102). This course gives you an excellent head start and a strong knowledge foundation."
        },
        {
          question: "Do I need any IT experience to start?",
          answer: "No. This is a Beginner-level course designed for people with no prior IT experience. We start from the basics and build your skills progressively through hands-on labs and real-world examples."
        },
        {
          question: "Will I be able to get a job after completing this course?",
          answer: "This course prepares you for entry-level IT roles such as help desk technician, desktop support specialist, and field service technician. Earning the CompTIA A+ certification alongside this training significantly improves your employability."
        },
        {
          question: "Do I need to purchase any hardware or software?",
          answer: "No special purchases are required. The course uses free virtual lab environments and demonstrates on commonly available hardware. A computer with internet access is all you need."
        },
        {
          question: "How is this different from free YouTube tutorials?",
          answer: "This course follows a structured, exam-aligned curriculum with progressive skill building, practice labs, downloadable study guides, and direct instructor support via WhatsApp. Free tutorials often lack structure and exam focus."
        }
      ]
    },
    {
      id: 4,
      title: "إدارة المشاريع الاحترافية — من التخطيط إلى التنفيذ",
      category: "PMP / Project Management",
      level: "Beginner",
      price: 29.00,
      students: 0,
      lessons: 1,
      rating: 0,
      date: "2026-02-01",
      language: "ar",
      description: "دورة شاملة في إدارة المشاريع تغطي دورة حياة المشروع من البداية إلى الإغلاق. تعلّم أساسيات التخطيط، إدارة النطاق والجدول الزمني، التحكم في التكاليف والمخاطر، وقيادة فرق العمل. مصممة للمبتدئين الراغبين في دخول مجال إدارة المشاريع أو تطوير مهاراتهم القيادية.",
      image: "og-image.png",
      instructor: "WaslaTalent Team",
      tags: ["إدارة مشاريع", "تخطيط", "project management", "قيادة", "فرق عمل", "ميزانية", "مخاطر"],
      driveUrl: "",
      learningObjectives: [
        "فهم دورة حياة المشروع الكاملة ومجموعات العمليات الخمس",
        "إعداد ميثاق المشروع وخطة إدارة المشروع الشاملة",
        "بناء هيكل تجزئة العمل (WBS) وتقدير الجدول الزمني والتكاليف",
        "تحديد المخاطر وتحليلها ووضع خطط الاستجابة المناسبة",
        "قيادة فرق العمل بفعالية وإدارة أصحاب المصلحة",
        "إغلاق المشروع باحترافية وتوثيق الدروس المستفادة"
      ],
      curriculum: [
        {
          title: "مقدمة في إدارة المشاريع",
          lessons: [
            { title: "ما هي إدارة المشاريع ولماذا هي مهمة؟", duration: "08:00", preview: true },
            { title: "دورة حياة المشروع — المراحل الخمس", duration: "12:00", preview: true },
            { title: "أدوار ومسؤوليات مدير المشروع", duration: "09:00", preview: false }
          ]
        },
        {
          title: "التخطيط وإدارة النطاق",
          lessons: [
            { title: "إعداد ميثاق المشروع وتحديد الأهداف", duration: "14:00", preview: false },
            { title: "بناء هيكل تجزئة العمل (WBS)", duration: "16:00", preview: false },
            { title: "تقدير الوقت والتكاليف — تقنيات عملية", duration: "13:00", preview: false }
          ]
        },
        {
          title: "إدارة المخاطر والجودة",
          lessons: [
            { title: "تحديد وتحليل المخاطر — الأدوات والأساليب", duration: "15:00", preview: false },
            { title: "خطط الاستجابة للمخاطر والمتابعة", duration: "11:00", preview: false },
            { title: "ضمان الجودة ومراقبتها في المشاريع", duration: "12:00", preview: false }
          ]
        },
        {
          title: "القيادة والإغلاق",
          lessons: [
            { title: "قيادة فرق العمل وإدارة أصحاب المصلحة", duration: "14:00", preview: false },
            { title: "إغلاق المشروع وتوثيق الدروس المستفادة", duration: "10:00", preview: false },
            { title: "خطواتك القادمة نحو شهادة PMP", duration: "06:00", preview: true }
          ]
        }
      ],
      faq: [
        {
          question: "هل أحتاج خبرة سابقة في إدارة المشاريع؟",
          answer: "لا. هذه الدورة مصممة للمبتدئين وتبدأ من الأساسيات. مناسبة لأي شخص يريد دخول مجال إدارة المشاريع أو تحسين مهاراته القيادية."
        },
        {
          question: "هل الدورة تؤهلني لامتحان PMP؟",
          answer: "الدورة تغطي المفاهيم الأساسية التي تحتاجها كقاعدة قبل التحضير لامتحان PMP. بعد إتمامها، ستكون مستعداً للانتقال إلى دورة التحضير المتقدمة للامتحان."
        },
        {
          question: "ما هي مدة الدورة؟",
          answer: "إجمالي المحتوى حوالي ساعتين ونصف من الفيديو. معظم الطلاب ينهون الدورة خلال أسبوع إلى أسبوعين بوتيرة مريحة."
        },
        {
          question: "هل أحصل على شهادة إتمام؟",
          answer: "نعم، تحصل على شهادة إتمام يمكنك مشاركتها على ملفك المهني في LinkedIn."
        },
        {
          question: "هل المحتوى متاح باللغة العربية بالكامل؟",
          answer: "نعم. جميع الدروس والمواد والتمارين باللغة العربية. المصطلحات التقنية مذكورة بالعربي والإنجليزي لتسهيل الفهم."
        }
      ]
    }
  ];

  var categories = {
    "HR":                       { color: "navy" },
    "PMP / Project Management": { color: "indigo" },
    "IT / Technical":           { color: "violet" }
  };

  var WHATSAPP_NUMBER = "966576874509";
  var BRAND_NAME      = "WaslaTalent Academy";
  var DOMAIN          = "waslatalent.com";

  // Auto-derive lessons count from curriculum before freezing
  courses.forEach(function (c) {
    if (c.curriculum && c.curriculum.length) {
      c.lessons = c.curriculum.reduce(function (sum, section) {
        return sum + (section.lessons ? section.lessons.length : 0);
      }, 0);
    }
  });

  return deepFreeze({
    courses:         courses,
    categories:      categories,
    WHATSAPP_NUMBER: WHATSAPP_NUMBER,
    BRAND_NAME:      BRAND_NAME,
    DOMAIN:          DOMAIN,

    META: {
      tagline: 'WaslaTalent Academy — Your Path to Professional Excellence',

      description: 'WaslaTalent Academy is a professional training platform specializing in HR, PMP, and IT certifications. ' +
                   'We deliver structured, career-focused courses designed by industry practitioners to help professionals ' +
                   'advance their careers, earn globally recognized certifications, and build the skills employers demand.',

      descriptionShort: 'Professional training in HR, Project Management, and IT — ' +
                        'structured courses with lifetime access and personal support.',

      ogImage:      '/assets/img/og-image.png',

      supportEmail: 'amr.omar0887@gmail.com',

      foundingYear: '2025',

      whatsappDefaultMessage: 'Hello! I have a question about your courses.',

      logoPath: '/assets/img/fav180.png',

      legalLastUpdated: '2026-02-23'
    }
  });

})();

if (typeof window !== 'undefined') window.COURSE_DATA = COURSE_DATA;
