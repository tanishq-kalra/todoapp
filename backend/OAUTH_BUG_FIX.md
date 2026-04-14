# OAuth Duplicate User Bug Fix

## 🐛 Problem Summary

**Issue**: Same user gets created twice when:
- User registers with email/password
- Then logs in with Google OAuth (same email)
- OR logs in with Google, then registers with email/password

**Root Causes**:
1. **mongomock doesn't enforce unique indexes** - Testing with localhost meant unique constraints were ignored
2. **Case-sensitive email matching** - "Test@example.com" vs "test@example.com" created separate users
3. **No duplicate key error handling** - Race conditions not caught
4. **Google OAuth didn't refresh user data** - Used stale `user` variable after insertion
5. **Missing profile picture storage** - No way to sync Google profile data

---

## ✅ Solution Implemented

### 1. **Email Normalization** (Case-Insensitive)
```python
def normalize_email(email: str) -> str:
    """Normalize email to lowercase for case-insensitive operations"""
    return email.lower().strip()
```

**Applied to**:
- ✅ Register endpoint - stores normalized email
- ✅ Login endpoint - searches with normalized email
- ✅ Google OAuth endpoint - normalizes Google email

**Result**: "Test@EXAMPLE.com" and "test@example.com" now map to same user

---

### 2. **Enhanced MongoDB Index with Collation**
```python
await db.users.create_index("email", unique=True, collation={"locale": "en", "strength": 2})
```

**Benefits**:
- ✅ Case-insensitive unique constraint
- ✅ Works with production MongoDB (not just mongomock)
- ✅ Prevents duplicate emails at database level

---

### 3. **Duplicate Key Error Handling**
```python
try:
    result = await db.users.insert_one(user)
except DuplicateKeyError:
    # Race condition: User was created between check and insert
    raise HTTPException(status_code=409, detail="Email already registered")
```

**Protects against**:
- ✅ Race conditions in concurrent requests
- ✅ Simultaneous Google OAuth + email registration
- ✅ Database-level constraint violations

---

### 4. **Google OAuth Deduplication Logic**

**New Flow**:
```
User clicks "Login with Google"
    ↓
Extract email from Google token → normalize it (lowercase)
    ↓
Query: Find user by normalized email
    ↓
IF user exists:
  → Optionally update name & picture if changed
  → Log user in (SAME user)
  → Return existing user's plan & data
    ↓
ELSE (user doesn't exist):
  → Create new user with normalized email
  → Store Google picture
  → Mark auth_method = "google"
  → Handle race condition with DuplicateKeyError catch
  → Log user in
```

**Code Changes**:
- ✅ Normalize email before check
- ✅ Check if user exists BEFORE creating
- ✅ Update profile picture from Google account
- ✅ Update name if user changed it in Google
- ✅ Mark auth method for auditing
- ✅ Refresh user object after creation/update
- ✅ Handle race conditions with try/except

---

### 5. **Register Endpoint Protection**

```python
# Normalize email to prevent case-sensitive duplicates
normalized_email = normalize_email(data.email)

# Check if user already exists
existing_user = await db.users.find_one({"email": normalized_email})
if existing_user:
    raise HTTPException(status_code=409, detail="Email already registered")

try:
    result = await db.users.insert_one(user)
except DuplicateKeyError:
    # Race condition: User was created between check and insert
    raise HTTPException(status_code=409, detail="Email already registered")
```

**Prevents**:
- ✅ Duplicate email registration
- ✅ Case-sensitivity bypasses
- ✅ Race condition duplicates

---

### 6. **Login Endpoint Update**

```python
# Normalize email to prevent case-sensitive mismatches
normalized_email = normalize_email(data.email)

user = await db.users.find_one({"email": normalized_email})
```

**Allows**:
- ✅ User registration with "Test@example.com"
- ✅ User login with "test@example.com" (same account)

---

## 📋 Changes Summary

| File | Change | Purpose |
|------|--------|---------|
| `server.py` | Added `normalize_email()` function | Case-insensitive email handling |
| `server.py` | Imported `DuplicateKeyError` | Race condition handling |
| `server.py` | Updated startup index | Case-insensitive unique constraint |
| `server.py` | Updated `register()` endpoint | Email normalization + error handling |
| `server.py` | Updated `login()` endpoint | Email normalization |
| `server.py` | Rewrote `google_auth()` endpoint | Deduplication + profile sync |
| `fix_duplicates.py` | NEW migration script | Fix existing duplicates |

---

## 🔄 Migration: Fix Existing Duplicates

### Step 1: Identify Duplicates
```bash
cd backend
python fix_duplicates.py
```

**Output**:
```
🔍 Starting duplicate user detection and fix...
Connected to database: todo_db
Total users found: 15

⚠️  Found 2 email(s) with duplicate accounts
============================================================

📧 Email: test@example.com
   Number of accounts: 2
   
   [1] User ID: 507f1f77bcf86cd799439011
       Name: Test User
       Auth Method: email
       Plan: normal
       Tasks: 5
       
   [2] User ID: 507f1f77bcf86cd799439012
       Name: Test User Google
       Auth Method: google
       Plan: normal
       Tasks: 0

   Merge strategy: Keep user with most tasks
   ✅ Keeping: 507f1f77bcf86cd799439011 (Test User)
   🔄 Merging tasks from: 507f1f77bcf86cd799439012
      Moved 0 tasks
      Updated 1 refresh token
      ❌ Deleted duplicate user
```

### Step 2: Verify Results
```bash
# Check MongoDB
mongo
use todo_db
db.users.find({"email": "test@example.com"}).count()
# Should return: 1 (not 2)

db.users.find({"email": "test@example.com"})
# Should show ONE user with all tasks merged
```

### Step 3: Restart Backend
```bash
# Kill old process
ctrl+c

# Restart
uvicorn server:app --reload
```

---

## 🧪 Testing: Verify Fix Works

### Test 1: Register → Google Login (Same User)
```
1. Register: email=test1@example.com, password=123456, name=John
2. Open incognito (clear cookies)
3. Google login with test1@example.com
4. ✅ Expect: Same user, no duplicate created
5. Verify: GET /api/auth/me returns same user_id
```

### Test 2: Google Login → Register (Blocked)
```
1. Google login with google-test@example.com
2. Attempt to register: email=google-test@example.com, password=123456
3. ✅ Expect: 409 Conflict - "Email already registered"
4. Verify: Still ONE user in database
```

### Test 3: Case-Insensitive Matching
```
1. Register: email=TestUser@Example.COM
2. Login: email=testuser@example.com
3. ✅ Expect: Successful login (not "Invalid credentials")
4. Google login with testuser@example.com
5. ✅ Expect: Same user, no duplicate
```

### Test 4: Race Condition Handling
```
Use artillery/k6 stress test to send simultaneous requests:
- Register with same email
- Google login with same email
- Verify: Only 1 user created, 409 errors for duplicates
```

---

## 📊 Database Schema Changes

### Users Collection
**New Fields**:
- `auth_method`: "email" | "google" | null (tracks registration method)
- `picture`: URL to Google profile picture (optional)

**Updated Query**:
```javascript
db.users.find({})
// Result:
{
  "_id": ObjectId("..."),
  "name": "John Doe",
  "email": "john@example.com",        // Always lowercase
  "password_hash": "$2b$12...",        // Empty string for Google users
  "plan": "normal",
  "picture": "https://...",           // NEW
  "auth_method": "google",            // NEW
  "created_at": ISODate("2024-01-15"),
  "updated_at": ISODate("2024-01-16")
}
```

### Index
```javascript
db.users.getIndexes()
// Result includes:
{
  "key": {"email": 1},
  "unique": true,
  "collation": {
    "locale": "en",
    "strength": 2      // Case-insensitive
  }
}
```

---

## 🛡️ Security Improvements

1. **Email Uniqueness Enforced at DB Level** - MongoDB prevents duplicates even with concurrent requests
2. **Case-Insensitive Matching** - Prevents spoofing (john@example.com vs John@example.com)
3. **Race Condition Protection** - DuplicateKeyError caught and handled
4. **Profile Data Sync** - Google picture keeps user profile current
5. **Auth Method Tracking** - Auditing capability for account origin

---

## ⚡ Performance Impact

- **Email Normalization**: O(1) - minimal overhead
- **Case-Insensitive Index**: Slight increase in index size, negligible query impact
- **Profile Updates**: Only on Google login (cached)
- **Database Queries**: Same as before (single find operation)

---

## 🚀 Deployment Checklist

- [ ] Run `fix_duplicates.py` to merge existing duplicates
- [ ] Verify database index created: `collation: {locale: "en", strength: 2}`
- [ ] Test register/login with mixed-case emails
- [ ] Test Google OAuth deduplication
- [ ] Monitor backend logs for DuplicateKeyError (should now be caught)
- [ ] Clear production browser cookies/sessions
- [ ] Update frontend to show success toast: "Successfully merged accounts"
- [ ] Optional: Send email to users explaining merge

---

## 📞 Troubleshooting

### Issue: "Email already registered" but user doesn't see account
**Solution**: User's cookies might be invalid. Clear cookies and re-login.

### Issue: fix_duplicates.py fails to connect
**Solution**: Verify MONGO_URL and DB_NAME in `.env` file are correct.

### Issue: Users still get duplicated
**Solution**:
1. Check MongoDB version supports collation (3.4+)
2. Try explicit query: `db.users.find({"email": "test@example.com"}).collation({"locale": "en", "strength": 2})`
3. Verify mongomock is NOT used in production (only in tests)

### Issue: Google picture not updating
**Solution**: Picture updates only if user changes it in Google account. Manual update requires MongoDB document edit.

---

## 📚 References

- [MongoDB Collation](https://docs.mongodb.com/manual/reference/collation/)
- [DuplicateKeyError](https://pymongo.readthedocs.io/en/stable/api/pymongo/errors.html)
- [Google OAuth Email Verification](https://developers.google.com/identity/protocols/oauth2/openid-connect)
- [Motor Async Python MongoDB Driver](https://motor.readthedocs.io/)

---

## ✨ Summary

**Before Fix**:
```
User 1 (email: test@example.com) → registers with password → user_id_1 created
Same user → logs in with Google → user_id_2 created (DUPLICATE!)
Database: 2 users, same email ❌
```

**After Fix**:
```
User 1 (email: test@example.com) → registers with password → user_id_1 created
Same user → logs in with Google → finds user_id_1, logs in (NO DUPLICATE!)
Database: 1 user, same email ✅
```

🎉 **Deduplication complete!**
