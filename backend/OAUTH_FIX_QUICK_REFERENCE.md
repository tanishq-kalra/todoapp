# OAuth Duplicate User Bug - Quick Fix Reference

## 🎯 What Was Fixed

**Problem**: Users get duplicated when using both Google OAuth and email/password login with the same email.

**Example**:
- User registers: `test@example.com` (password) → Creates user_id_1
- Same user logs in: `Test@Example.com` (Google) → Creates user_id_2 ❌ DUPLICATE!

---

## ✅ How It's Fixed

### 1. Email Normalization
```python
def normalize_email(email: str) -> str:
    return email.lower().strip()  # "Test@EXAMPLE.com" → "test@example.com"
```

### 2. Case-Insensitive Database Index
```python
await db.users.create_index("email", unique=True, 
    collation={"locale": "en", "strength": 2})
```

### 3. Google OAuth Deduplication
- ✅ Normalize email from Google token
- ✅ Check if user exists (don't auto-create)
- ✅ If exists: login that user
- ✅ If not exists: create once
- ✅ Handle race conditions
- ✅ Update profile picture if changed

### 4. Register/Login Protection
- ✅ Normalize email on both endpoints
- ✅ Catch `DuplicateKeyError` for race conditions
- ✅ Return 409 Conflict if email exists

---

## 📂 Files Modified

| File | Changes |
|------|---------|
| `backend/server.py` | Email normalization + OAuth dedup + error handling |
| `backend/fix_duplicates.py` | **NEW** - Migration script to fix existing duplicates |
| `backend/OAUTH_BUG_FIX.md` | Comprehensive documentation |

---

## 🚀 Implementation Steps

### Step 1: Pull Latest Code
```bash
git pull origin main
# Verify changes in server.py
```

### Step 2: Fix Existing Duplicates (if any)
```bash
cd backend
python fix_duplicates.py
```

**Output**: Shows duplicates and merges them into single user

### Step 3: Restart Backend
```bash
# Kill current server
Ctrl + C

# Restart with new code
uvicorn server:app --reload
```

### Step 4: Test the Fix

**Test A - Register then Google Login**:
```
1. Register: email=john@example.com, password=123456
2. Close browser (clear cookies)
3. Google login: john@example.com
✅ Should see same user (not duplicate)
```

**Test B - Case-Insensitive**:
```
1. Register: email=John@EXAMPLE.com
2. Login: email=john@example.com
✅ Should succeed (same account)
3. Google login: JOHN@EXAMPLE.COM
✅ Should work (same account, no duplicate)
```

**Test C - Reject Duplicate Registration**:
```
1. Google login: test@example.com → creates user
2. Attempt register: test@example.com, password=123
✅ Should get: "Email already registered" (409 error)
```

---

## 🔑 Key Changes in Code

### `normalize_email()` Function (NEW)
```python
def normalize_email(email: str) -> str:
    """Normalize email to lowercase for case-insensitive operations"""
    return email.lower().strip()
```

### Register Endpoint
```python
@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    normalized_email = normalize_email(data.email)  # ← NEW
    
    existing_user = await db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # ... rest of code
    
    try:
        result = await db.users.insert_one(user)
    except DuplicateKeyError:  # ← NEW (race condition protection)
        raise HTTPException(status_code=409, detail="Email already registered")
```

### Login Endpoint
```python
@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    normalized_email = normalize_email(data.email)  # ← NEW
    user = await db.users.find_one({"email": normalized_email})
    # ... rest of code
```

### Google OAuth Endpoint (COMPLETELY REWRITTEN)
```python
@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthRequest, response: Response):
    # ... validate token ...
    
    email = normalize_email(idinfo['email'])  # ← NEW: normalize
    name = idinfo.get('name', email.split("@")[0])
    picture = idinfo.get('picture', None)     # ← NEW: store picture
    
    user = await db.users.find_one({"email": email})
    
    if not user:
        # ← NEW: create user with error handling
        try:
            result = await db.users.insert_one(new_user)
            user_id_str = str(result.inserted_id)
            user = new_user
        except DuplicateKeyError:
            # ← NEW: race condition fallback
            user = await db.users.find_one({"email": email})
    else:
        # ← NEW: update existing user's profile
        # Update name if different
        # Update picture if different
        # Mark auth_method
        
    # ← NEW: always use user data (no stale variables)
    return {"token": access_token, "user": {...}}
```

---

## 📊 Database Changes

### Index Updated
```javascript
// Before
db.users.create_index({"email": 1}, {unique: true})

// After
db.users.create_index({"email": 1}, {
  unique: true,
  collation: {locale: "en", strength: 2}  // Case-insensitive
})
```

### User Document (Optional New Fields)
```javascript
{
  "name": "John Doe",
  "email": "john@example.com",     // Always lowercase
  "picture": "https://...",        // NEW: from Google
  "auth_method": "google",         // NEW: tracks auth type
  "plan": "normal",
  // ... other fields ...
}
```

---

## 🧪 Testing Commands

### Check for Duplicates
```bash
cd backend
python fix_duplicates.py
```

### Manually Query MongoDB
```bash
mongo
use todo_db

# Check if duplicate emails exist
db.users.aggregate([
  {$group: {_id: "$email", count: {$sum: 1}}},
  {$match: {count: {$gt: 1}}}
])
# Result: [] (no duplicates = good!)

# Check that case-insensitive index exists
db.users.getIndexes()
# Look for: "collation": {locale: "en", "strength": 2}
```

### Test API Endpoints
```bash
# Test 1: Register and verify it works
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"123456"}'

# Test 2: Try to register same email again (should fail)
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test2","email":"test@example.com","password":"123456"}'
# Expected: 409 Conflict

# Test 3: Login with different case (should work)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"TEST@EXAMPLE.COM","password":"123456"}'
# Expected: 200 OK with token
```

---

## ⚠️ Important Notes

1. **mongomock Limitation**: Testing with localhost uses mongomock which DOESN'T enforce unique indexes. So `fix_duplicates.py` is essential for cleaning up test data.

2. **Production MongoDB**: Will properly enforce the collation-based unique index.

3. **Email Reset**: If users have accounts with mixed-case emails, they need to:
   - Login with lowercase version
   - OR run `fix_duplicates.py` to merge duplicates

4. **Backward Compatibility**: All existing features work unchanged. This only fixes OAuth duplication.

---

## ✨ Success Indicators

After deployment, you should see:

✅ No more duplicate users in database  
✅ Email login works with any case: "john@example.com", "JOHN@EXAMPLE.COM", "John@Example.Com"  
✅ Google login maps to same user as email login  
✅ 409 error when registering existing email  
✅ Profile picture synced from Google account  

---

## 📞 Troubleshooting

**Q: fix_duplicates.py won't run**  
A: Check `.env` file has correct MONGO_URL and DB_NAME

**Q: Still getting duplicates after fix**  
A: Verify MongoDB is used (not mongomock) in production. Restart backend service.

**Q: Users removed by fix_duplicates.py**  
A: Script keeps user with most tasks and merges all data. No data is lost, just consolidated.

**Q: Google picture not updating**  
A: Updates only when user next logs in with Google. Automatic daily sync not implemented (future feature).

---

## 🎉 Summary

Your OAuth duplicate bug is now **completely fixed** with:
- ✅ Case-insensitive email matching
- ✅ Database-level unique constraint
- ✅ Race condition protection
- ✅ Profile data synchronization
- ✅ Migration script for existing duplicates

Deploy with confidence! 🚀
