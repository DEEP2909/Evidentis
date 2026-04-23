with open('.github/workflows/ci.yml', 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i, line in enumerate(lines):
        if 'OLLAMA_BASE_URL' in line:
            print("".join(lines[max(0, i-5):min(len(lines), i+5)]))
