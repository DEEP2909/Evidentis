with open('apps/web/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'const { data: billingData' in line:
            print(f"Line {i+1}: " + "".join(lines[i:i+5]))
