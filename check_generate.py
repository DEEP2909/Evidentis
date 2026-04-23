with open('apps/web/app/templates/[id]/generate/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'Generate Draft' in line:
            print("".join(lines[max(0, i-10):min(len(lines), i+5)]))
