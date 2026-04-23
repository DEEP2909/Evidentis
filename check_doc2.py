with open('apps/web/app/documents/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if '<Button className="btn-ripple"' in line:
            print("".join(lines[i-15:i+5]))
