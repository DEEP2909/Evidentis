with open('apps/web/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'export default function AdminPage' in line:
            print("".join(lines[i:i+20]))
