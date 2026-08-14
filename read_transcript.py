import json

filepath = 'C:/Users/rajde/.gemini/antigravity-ide/brain/4fbb3c8d-6cc7-41b5-8ad3-41f9c393dadf/.system_generated/logs/transcript.jsonl'
lines = []
with open(filepath, 'r', encoding='utf-8') as f:
    for line in f:
        data = json.loads(line)
        if data.get('type') in ('USER_INPUT', 'PLANNER_RESPONSE'):
            source = data.get('source')
            content = data.get('content', '')
            if type(content) is str:
                content = content[:300].replace('\n', ' ')
            lines.append(f"[{source}] {content}")

for l in lines[-15:]:
    print(l)
    print("-" * 50)
