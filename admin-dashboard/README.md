# TutorAI Admin Dashboard

A comprehensive web-based admin dashboard for monitoring and managing the TutorAI platform.

## 🚀 Features

### Dashboard Overview
- Key metrics (Total Users, Active Today, Weekly Growth, K-Factor)
- Quick stats (Pending fraud, Active experiments)
- Recent activity feed

### Growth Metrics
- **K-Factor Dashboard**: Track viral coefficient by loop type
- **Conversion Funnel**: Analyze user journey and drop-off points
- **Retention Analysis**: Monitor cohort retention curves
- **Percentile Monitor**: View XP distribution by role

### Session Intelligence
- **Daily Summaries**: View aggregated session summaries
- **Weekly Summaries**: Track weekly progress and trends
- **SI Analytics**: Monitor transcription health and errors

### Fraud Detection
- Review suspicious referrals
- Approve/reject fraud items
- Batch operations for efficiency
- Anomaly score visualization

### Experiments
- A/B test management
- Activate/deactivate experiments
- View variant details and metrics
- Target audience configuration

### System Management
- **Kill Switches**: Toggle feature flags by category
- **User Management**: Search, ban, export user data
- **Audit Log**: Track admin actions and system events
- **System Health**: Monitor functions, quotas, scheduled jobs

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: Material-UI (MUI) v7
- **State Management**: TanStack React Query
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Date Handling**: date-fns

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔐 Environment Variables

Create a `.env` file in the `admin-dashboard` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Use emulators in development
# VITE_USE_EMULATORS=true
```

## 👨‍💼 Admin Setup

### Setting Admin Custom Claims

1. Navigate to the functions directory:
```bash
cd ../functions
```

2. Run the admin setup script:
```bash
npx ts-node scripts/setAdminClaim.ts admin@example.com admin
```

3. Or deploy and call the `setupAdminUser` Cloud Function:
```bash
firebase deploy --only functions:setupAdminUser

# Call via HTTP
curl -X POST https://us-central1-your-project.cloudfunctions.net/setupAdminUser \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","role":"admin"}'
```

### Admin Roles

- `admin`: Full access to all features
- `analyst`: Read-only access to metrics
- `support`: Limited access to user management

## 📁 Project Structure

```
admin-dashboard/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Cards/         # Metric/Stat cards
│   │   ├── Charts/        # Recharts visualizations
│   │   ├── Common/        # Loading/Error/Empty states
│   │   ├── Filters/       # Filter components
│   │   ├── Layout/        # Sidebar, TopBar, MainLayout
│   │   └── Tables/        # Data tables
│   ├── contexts/          # React contexts (Auth)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Firebase SDK initialization
│   ├── pages/             # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── Growth/
│   │   ├── SessionIntel/
│   │   ├── Fraud/
│   │   ├── Experiments/
│   │   └── System/
│   ├── services/          # API services
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── theme.ts           # MUI theme configuration
├── public/                # Static assets
├── .env                   # Environment variables
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎨 UI Guidelines

### Color Palette
- **Primary**: #1DB954 (Spotify Green)
- **Error**: #FF3B30
- **Warning**: #FF9500
- **Success**: #34C759
- **Info**: #007AFF

### Design Principles
- **Spotify-inspired**: Bold typography, gradients, motion
- **Dark theme**: Primary UI uses dark backgrounds
- **Card-based**: Grouped content in elevated cards
- **Responsive**: Mobile-first design approach

## 🔒 Security

### Authentication
- Firebase Authentication with custom claims
- Admin-only routes protected by `ProtectedRoute` component
- Custom claims verified on backend for all sensitive operations

### Firestore Rules
- All admin collections require `isAdmin()` helper check
- Read-only access for most collections
- Write access restricted to Cloud Functions

### Best Practices
- Never expose Firebase Admin SDK credentials in frontend
- Use HTTPS-only callable functions for sensitive operations
- Log all admin actions to audit log
- Implement rate limiting on API endpoints

## 📊 Data Flow

### Growth Metrics
1. Frontend calls Firestore directly or Cloud Functions
2. Data aggregated by backend scheduled jobs
3. Results cached in React Query for 5 minutes
4. Auto-refresh intervals vary by feature (30s-2m)

### User Management
1. Search queries run against Firestore `users` collection
2. Detailed profiles fetched via `getUserProfile` Cloud Function
3. Ban/unban actions write directly to Firestore
4. Audit log automatically records all actions

### System Health
1. Mock data for MVP (Cloud Function placeholder)
2. Production implementation queries Cloud Monitoring API
3. Aggregates function stats, quotas, and usage metrics

## 🧪 Testing

```bash
# Run type check
npm run type-check

# Run linter
npm run lint

# Build production bundle (tests for build errors)
npm run build
```

### Manual Testing Checklist

- [ ] Login with admin account
- [ ] Navigate to all dashboard sections
- [ ] Test filters on each page
- [ ] Ban/unban a user
- [ ] Toggle a kill switch
- [ ] Approve/reject fraud item
- [ ] Export data to CSV
- [ ] Test responsive design (mobile/tablet)

## 🚢 Deployment

### Firebase Hosting (Optional)

1. Add hosting configuration to `firebase.json` in project root:
```json
{
  "hosting": {
    "site": "admin-tutorai",
    "public": "admin-dashboard/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

2. Build and deploy:
```bash
npm run build
firebase deploy --only hosting:admin
```

3. Access at: `https://admin-tutorai.web.app`

### Alternative: Vercel/Netlify

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables from `.env`
5. Deploy

## 🐛 Troubleshooting

### "Missing or insufficient permissions"
- Verify user has admin custom claim set
- Check Firestore security rules for `isAdmin()` helper
- Confirm user is logged in

### "The query requires an index"
- Click the provided link to create the index
- Or add manually to `firestore.indexes.json`
- Deploy indexes: `firebase deploy --only firestore:indexes`

### Charts not rendering
- Check that data is in the correct format
- Verify Recharts is installed: `npm install recharts`
- Check browser console for errors

### Build errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript version compatibility
- Verify all imports are correct

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [MUI Documentation](https://mui.com/material-ui/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Recharts Documentation](https://recharts.org/)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test thoroughly
3. Commit with descriptive message: `git commit -m "feat: add feature X"`
4. Push to GitHub: `git push origin feature/my-feature`
5. Create Pull Request

## 📝 License

Proprietary - TutorAI Internal Use Only

## 📞 Support

For issues or questions, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: November 5, 2025
