# Admin Dashboard Setup Guide

## Prerequisites

The admin dashboard requires users to have the `admin=true` custom claim set in Firebase Auth.

## Setting Admin Custom Claims

### Option 1: Firebase CLI

```bash
# Set admin claim for a user
firebase auth:users:update user@example.com --custom-claims '{"admin":true,"role":"admin"}'

# Verify the claim was set
firebase auth:users:get user@example.com
```

### Option 2: Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** > **Users**
4. Click on the user you want to make an admin
5. Scroll to **Custom claims**
6. Add custom claims:
   ```json
   {
     "admin": true,
     "role": "admin"
   }
   ```
7. Save

### Option 3: Cloud Function (Programmatic)

Create a Cloud Function to set admin claims:

```typescript
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const setAdminClaim = onCall(async (request) => {
  // Only allow if caller is already an admin
  if (!request.auth?.token.admin) {
    throw new HttpsError('permission-denied', 'Only admins can grant admin access');
  }
  
  const { uid } = request.data;
  
  await admin.auth().setCustomUserClaims(uid, {
    admin: true,
    role: 'admin',
  });
  
  return { success: true };
});
```

## After Setting Custom Claims

**IMPORTANT**: Users must sign out and sign back in for custom claims to take effect.

The auth token is cached and won't include the new claims until refreshed.

```typescript
// Force token refresh (if implementing in UI)
const user = auth.currentUser;
if (user) {
  await user.getIdToken(true); // force refresh
}
```

## Firestore Security Rules

The following collections require admin access for the dashboard to work:

### Required Rules

```javascript
function isAdmin() {
  return request.auth != null && request.auth.token.admin == true;
}

// Users collection
match /users/{uid} {
  allow read: if isAdmin(); // ✅ Already in place
}

// Conversations collection
match /conversations/{conversationId} {
  allow read: if isAdmin(); // ⚠️ May need to add
}

// Referrals collection
match /referrals/{referralId} {
  allow read: if isAdmin(); // ⚠️ May need to add
}

// Balances collection
match /balances/{uid} {
  allow read: if isAdmin(); // ⚠️ May need to add
}

// Experiments collection
match /experiments/{experimentId} {
  allow read, write: if isAdmin(); // ✅ Already in place
}

// Fraud queue
match /fraud_queue/{queueId} {
  allow read: if isAdmin(); // ✅ Already in place
}
```

## Verification

After setting up admin access, verify by checking the browser console when logging in:

```
[Funnel Metrics] User authenticated: { uid: "...", email: "...", isAdmin: true, allClaims: {...} }
```

If you see `isAdmin: false`, the custom claim is not set correctly.

## Troubleshooting

### "Missing or insufficient permissions" error

**Symptom**: Console shows:
```
Error fetching funnel metrics: FirebaseError: Missing or insufficient permissions.
```

**Diagnosis**:
1. Check if user has admin claim:
   ```bash
   firebase auth:users:get user@example.com
   ```
   Look for `"admin": true` in customClaims

2. Check browser console logs:
   ```
   [Funnel Metrics] User authenticated: { ..., isAdmin: false }
   ```

**Solutions**:

1. **User missing admin claim**:
   ```bash
   firebase auth:users:update user@example.com --custom-claims '{"admin":true}'
   ```

2. **User needs to refresh token**:
   - Sign out completely
   - Sign back in
   - Or force refresh: `user.getIdToken(true)`

3. **Firestore rules not configured**:
   - Check `firestore.rules` file
   - Ensure admin can read all required collections
   - Deploy rules: `firebase deploy --only firestore:rules`

### "No authenticated user" error

**Solution**: User needs to log in through the login page first.

### Admin claim set but still getting permission denied

**Possible causes**:
1. Token not refreshed (sign out/in required)
2. Firestore rules deployed but not active yet (wait 1-2 minutes)
3. Wrong Firebase project selected

**Verify**:
```javascript
// In browser console
const user = firebase.auth().currentUser;
const token = await user.getIdTokenResult();
console.log(token.claims); // Should show admin: true
```

## Production Deployment

For production, create an onboarding Cloud Function:

```typescript
export const onboardAdmin = onCall(async (request) => {
  // Implement proper authorization (e.g., secret key, existing super-admin)
  
  const { email, role = 'admin' } = request.data;
  
  const user = await admin.auth().getUserByEmail(email);
  
  await admin.auth().setCustomUserClaims(user.uid, {
    admin: true,
    role,
  });
  
  return { success: true, uid: user.uid };
});
```

Then call it once to set up the first admin, who can then grant access to others.

