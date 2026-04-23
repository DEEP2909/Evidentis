with open('apps/web/app/invitation/[token]/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'w-full' in line and 'Button' in line:
            print("".join(lines[i-2:i+5]))
