"""
MongoDB Migration Script: Fix Duplicate Users Bug
This script identifies and fixes duplicate user accounts caused by the OAuth bug.

Usage:
    python fix_duplicates.py
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def fix_duplicates():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🔍 Starting duplicate user detection and fix...")
    print(f"Connected to database: {db_name}")
    
    # Get all users
    all_users = await db.users.find({}).to_list(None)
    print(f"Total users found: {len(all_users)}")
    
    # Group users by normalized email (lowercase)
    email_groups = defaultdict(list)
    for user in all_users:
        email_normalized = user['email'].lower().strip()
        email_groups[email_normalized].append(user)
    
    # Find duplicates
    duplicates = {email: users for email, users in email_groups.items() if len(users) > 1}
    
    if not duplicates:
        print("✅ No duplicates found!")
        client.close()
        return
    
    print(f"\n⚠️  Found {len(duplicates)} email(s) with duplicate accounts")
    print("=" * 60)
    
    # Process each duplicate email
    for email, users in duplicates.items():
        print(f"\n📧 Email: {email}")
        print(f"   Number of accounts: {len(users)}")
        print()
        
        for idx, user in enumerate(users, 1):
            tasks_count = await db.tasks.count_documents({"user_id": user["_id"]})
            print(f"   [{idx}] User ID: {user['_id']}")
            print(f"       Name: {user.get('name', 'N/A')}")
            print(f"       Auth Method: {user.get('auth_method', 'email')}")
            print(f"       Plan: {user.get('plan', 'normal')}")
            print(f"       Tasks: {tasks_count}")
            print(f"       Created: {user.get('created_at', 'N/A')}")
            print()
        
        # Decision: Keep the user with most tasks (most active)
        # or keep the oldest user (first to register)
        print(f"   Merge strategy: Keep user with most tasks")
        
        # Sort by task count (descending) and creation date (ascending)
        sorted_users = sorted(
            users,
            key=lambda u: (
                -asyncio.run(db.tasks.count_documents({"user_id": u["_id"]})),
                u.get("created_at", datetime.max)
            )
        )
        
        primary_user = sorted_users[0]
        duplicate_users = sorted_users[1:]
        
        print(f"   ✅ Keeping: {primary_user['_id']} ({primary_user.get('name')})")
        
        # Merge all tasks to primary user
        for dup_user in duplicate_users:
            print(f"   🔄 Merging tasks from: {dup_user['_id']} ({dup_user.get('name')})")
            
            # Update all tasks to use primary user ID
            result = await db.tasks.update_many(
                {"user_id": dup_user["_id"]},
                {"$set": {"user_id": primary_user["_id"]}}
            )
            print(f"      Moved {result.modified_count} tasks")
            
            # Update all refresh tokens to use primary user ID
            result = await db.refresh_tokens.update_many(
                {"user_id": str(dup_user["_id"])},
                {"$set": {"user_id": str(primary_user["_id"])}}
            )
            print(f"      Updated {result.modified_count} refresh tokens")
            
            # Delete duplicate user
            result = await db.users.delete_one({"_id": dup_user["_id"]})
            print(f"      ❌ Deleted duplicate user: {dup_user['_id']}")
    
    print("\n" + "=" * 60)
    print("✅ Duplicate fix complete!")
    print("\nNext steps:")
    print("1. Update MongoDB index with case-insensitive collation")
    print("2. Restart the backend server")
    print("3. Test with both Google OAuth and email login")
    
    client.close()

if __name__ == "__main__":
    from datetime import datetime
    asyncio.run(fix_duplicates())
