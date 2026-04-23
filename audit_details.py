import os

files_to_check = [
    "apps/web/app/documents/page.tsx",
    "apps/web/app/invitation/[token]/page.tsx",
    "apps/web/app/matters/page.tsx",
    "apps/web/app/matters/[id]/documents/[docId]/page.tsx",
    "apps/web/app/reset-password/[token]/page.tsx",
    "apps/web/app/templates/page.tsx",
    "apps/web/app/templates/[id]/generate/page.tsx",
    "apps/web/components/admin/UserManagement.tsx",
    "apps/web/components/documents/DocumentCard.tsx"
]

for file in files_to_check:
    print(f"\n--- {file} ---")
    try:
        with open(file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines):
                if '<Button' in line or '<button' in line:
                    start = max(0, i - 2)
                    end = min(len(lines), i + 4)
                    print(f"Lines {start}-{end}:")
                    print("".join(lines[start:end]))
    except FileNotFoundError:
        print("File not found.")
