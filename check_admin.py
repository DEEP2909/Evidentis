with open('apps/web/app/admin/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'queryKey: ["billing"]' in line:
            print("".join(lines[i-2:i+5]))
