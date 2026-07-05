import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from backend.dependencies import get_supabase_admin
import asyncio

def setup_storage():
    supabase = get_supabase_admin()
    print("Checking buckets...")
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print("Existing buckets:", bucket_names)
        
        if "hospital-files" not in bucket_names:
            print("Creating 'hospital-files' bucket...")
            supabase.storage.create_bucket("hospital-files")
            print("Bucket created successfully!")
            
            try:
                supabase.storage.update_bucket("hospital-files", {"public": True})
                print("Made bucket public")
            except Exception as e:
                print("Could not make public:", e)
        else:
            print("Bucket already exists.")
            
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    setup_storage()
