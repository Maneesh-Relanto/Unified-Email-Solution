export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  date: Date;
  read: boolean;
  providerName?: string;
  // Full email content
  body?: string;
  html?: string;
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  color: string;
  abbreviation: string;
  emails: Email[];
}

// Helper to create initials-based avatar colors
const getAvatarColor = (name: string): string => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-cyan-500",
    "bg-indigo-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
};

export const mockProviders: Provider[] = [
  {
    id: "gmail",
    name: "Gmail",
    icon: "📧",
    color: "bg-red-500",
    abbreviation: "GM",
    emails: [
      {
        id: "gmail-1",
        from: {
          name: "Sarah Anderson",
          email: "sarah.anderson@company.com",
          avatar: getAvatarColor("Sarah"),
        },
        subject: "Quarterly Review Meeting Scheduled",
        preview:
          "Hi, I wanted to confirm our quarterly review meeting. Let me know if Tuesday at 2 PM works for you.",
        date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        read: false,
      },
      {
        id: "gmail-2",
        from: {
          name: "Michael Chen",
          email: "michael.chen@opensource.dev",
          avatar: getAvatarColor("Michael"),
        },
        subject: "PR Review: Email Analyzer Feature",
        preview:
          "Thanks for the pull request! I've added some comments on the implementation. Great work overall!",
        date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        read: true,
      },
      {
        id: "gmail-3",
        from: {
          name: "Emma Wilson",
          email: "emma.wilson@design.io",
          avatar: getAvatarColor("Emma"),
        },
        subject: "New Design System Components",
        preview:
          "The new button components look amazing! Can we schedule a sync to discuss the color palette?",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        read: false,
      },
      {
        id: "gmail-4",
        from: {
          name: "David Kumar",
          email: "david.kumar@backend.dev",
          avatar: getAvatarColor("David"),
        },
        subject: "Database Migration Complete",
        preview:
          "The migration to PostgreSQL 15 is complete. All services are running without issues.",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        read: true,
      },
      {
        id: "gmail-5",
        from: {
          name: "Lisa Thompson",
          email: "lisa.thompson@marketing.co",
          avatar: getAvatarColor("Lisa"),
        },
        subject: "Marketing Campaign Launch",
        preview:
          "Excited to announce that our new campaign goes live tomorrow! The metrics are looking very promising.",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        read: true,
      },
    ],
  },
  {
    id: "yahoo",
    name: "Yahoo",
    icon: "🔷",
    color: "bg-purple-600",
    abbreviation: "YH",
    emails: [
      {
        id: "yahoo-1",
        from: {
          name: "John Roberts",
          email: "john.roberts@yahoo.com",
          avatar: getAvatarColor("John"),
        },
        subject: "Your Monthly Newsletter",
        preview:
          "Check out the latest articles and updates from Yahoo News. This month features industry trends.",
        date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        read: false,
      },
      {
        id: "yahoo-2",
        from: {
          name: "Patricia Lee",
          email: "patricia.lee@yahoo.com",
          avatar: getAvatarColor("Patricia"),
        },
        subject: "Reminder: Annual Subscription Renewal",
        preview:
          "Your subscription is about to expire. Renew now to maintain uninterrupted access to premium features.",
        date: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        read: false,
      },
      {
        id: "yahoo-3",
        from: {
          name: "Robert Brown",
          email: "robert.brown@finance.yahoo.com",
          avatar: getAvatarColor("Robert"),
        },
        subject: "Your Investment Portfolio Update",
        preview:
          "Your portfolio has updated with today's market close. Overall return: +5.2% this quarter.",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        read: true,
      },
      {
        id: "yahoo-4",
        from: {
          name: "Susan Martinez",
          email: "susan.martinez@yahoo.com",
          avatar: getAvatarColor("Susan"),
        },
        subject: "Travel Booking Confirmation",
        preview:
          "Your flight booking is confirmed! Booking reference: YH2024001. Check-in opens 24 hours before.",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        read: true,
      },
      {
        id: "yahoo-5",
        from: {
          name: "James Wilson",
          email: "james.wilson@support.yahoo.com",
          avatar: getAvatarColor("James"),
        },
        subject: "Security Update - Action Required",
        preview:
          "We detected unusual activity on your account. Please verify your identity to continue.",
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        read: false,
      },
    ],
  },
  {
    id: "outlook",
    name: "Outlook",
    icon: "📬",
    color: "bg-blue-500",
    abbreviation: "OL",
    emails: [
      {
        id: "outlook-1",
        from: {
          name: "Microsoft Teams",
          email: "noreply@microsoft.com",
          avatar: getAvatarColor("M"),
        },
        subject: "Meeting Request: Project Kickoff",
        preview:
          "You are invited to a meeting: Project Kickoff - Wednesday, 10:00 AM EST. Please accept or decline.",
        date: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        read: false,
      },
      {
        id: "outlook-2",
        from: {
          name: "Jennifer Davis",
          email: "jennifer.davis@company.outlook.com",
          avatar: getAvatarColor("Jennifer"),
        },
        subject: "Document Share: Q4 Planning",
        preview:
          "I've shared a document with you for our Q4 planning session. Your feedback is much appreciated!",
        date: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        read: true,
      },
      {
        id: "outlook-3",
        from: {
          name: "Christopher Walsh",
          email: "christopher.walsh@company.outlook.com",
          avatar: getAvatarColor("Christopher"),
        },
        subject: "Budget Approval Request",
        preview:
          "Your budget request for Q1 2024 has been reviewed. It requires executive approval before proceeding.",
        date: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
        read: false,
      },
      {
        id: "outlook-4",
        from: {
          name: "Azure Support",
          email: "support@microsoft.azure.com",
          avatar: getAvatarColor("A"),
        },
        subject: "Your Azure VM Maintenance Window",
        preview:
          "Scheduled maintenance on your Azure resources. Downtime expected: 2 hours on Saturday night.",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        read: true,
      },
      {
        id: "outlook-5",
        from: {
          name: "HR Department",
          email: "hr@company.outlook.com",
          avatar: getAvatarColor("H"),
        },
        subject: "Open Positions: We're Hiring!",
        preview:
          "Check out our open positions in Engineering, Design, and Product Management. Apply now!",
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        read: true,
      },
    ],
  },
  {
    id: "rediff",
    name: "Rediff",
    icon: "🔴",
    color: "bg-red-600",
    abbreviation: "RD",
    emails: [
      {
        id: "rediff-1",
        from: {
          name: "Rediff Shopping",
          email: "deals@shopping.rediff.com",
          avatar: getAvatarColor("R"),
        },
        subject: "Mega Sale Today: Up to 70% Off!",
        preview:
          "Don't miss our flash sale happening right now. Exclusive deals on electronics, fashion, and more.",
        date: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        read: false,
      },
      {
        id: "rediff-2",
        from: {
          name: "Rediff Money",
          email: "news@rediffmoney.com",
          avatar: getAvatarColor("R"),
        },
        subject: "Market Update: Sensex Up 150 Points",
        preview:
          "Today's market overview: The Sensex closed up 150 points. Read our detailed market analysis.",
        date: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        read: true,
      },
      {
        id: "rediff-3",
        from: {
          name: "Arun Prabhudesai",
          email: "arun.prabhudesai@rediff.com",
          avatar: getAvatarColor("Arun"),
        },
        subject: "Your Scholarship Results",
        preview:
          "Congratulations! You have been selected for the merit scholarship. Details of the award inside.",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        read: false,
      },
      {
        id: "rediff-4",
        from: {
          name: "Rediff Cricket",
          email: "cricket@rediff.com",
          avatar: getAvatarColor("C"),
        },
        subject: "Cricket Series: India vs Australia",
        preview:
          "Catch all the updates and live scores from the India vs Australia cricket series happening this week.",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        read: true,
      },
      {
        id: "rediff-5",
        from: {
          name: "Rajesh Kumar",
          email: "rajesh.kumar@rediff.co.in",
          avatar: getAvatarColor("Rajesh"),
        },
        subject: "Conference Speaking Opportunity",
        preview:
          "We would love to have you speak at our annual tech conference. Please let us know your availability.",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        read: true,
      },
    ],
  },
];
