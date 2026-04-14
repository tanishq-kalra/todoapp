import sys
import traceback
import os

os.chdir(r'd:\todo-fullstack\todo-fullstack\backend')

try:
    print("Attempting to import server...")
    import server
    print("✅ Server imported successfully!")
    print(f"App object type: {type(server.app)}")
except Exception as e:
    print(f"❌ Import failed!")
    traceback.print_exc()
    sys.exit(1)
