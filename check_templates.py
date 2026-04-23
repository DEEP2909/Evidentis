with open('apps/web/app/templates/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'Save Template' in line:
            print("".join(lines[max(0, i-15):min(len(lines), i+5)]))
