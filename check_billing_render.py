with open('apps/web/app/billing/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if '{currentPlan.name}' in line:
            print("".join(lines[i-5:i+10]))
            break
