with open('apps/web/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'function AdminContent()' in line:
            print("".join(lines[i:i+5]))
        if 'CURRENT_PLAN.name' in line:
            print("".join(lines[i-10:i+10]))
