with open('apps/web/app/dashboard/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'const { data: billingData' in line:
            print("".join(lines[i:i+8]))
            break
