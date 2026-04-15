import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def main():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Forcefully upgrade all testing users to premium
    result = await db.users.update_many({}, {"$set": {"plan": "premium"}})
    print(f"Upgraded {result.modified_count} users to premium!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
