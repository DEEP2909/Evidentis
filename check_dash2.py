with open('apps/web/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'import' in line and 'api' in line:
            print(line.strip())
