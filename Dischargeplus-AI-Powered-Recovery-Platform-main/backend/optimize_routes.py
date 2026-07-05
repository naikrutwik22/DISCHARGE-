import os
import re

ROUTERS_DIR = "routers"

# We want to replace "async def " with "def "
# We want to replace "await file.read()" with "file.file.read()"
# We want to replace "async with httpx.AsyncClient()" with "with httpx.Client()"
# We want to replace "await client.post(" with "client.post("

def optimize_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Apply fixes
    content = content.replace("async def ", "def ")
    content = content.replace("await file.read()", "file.file.read()")
    content = content.replace("async with httpx.AsyncClient()", "with httpx.Client()")
    content = content.replace("await client.post(", "client.post(")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    for fname in os.listdir(ROUTERS_DIR):
        if fname.endswith(".py") and fname != "__init__.py":
            optimize_file(os.path.join(ROUTERS_DIR, fname))
    print("Optimization complete.")
