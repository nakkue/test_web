import json
import re
import platform
from collections import defaultdict
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib import font_manager, rc
from kiwipiepy import Kiwi

# 1. 폰트 설정
if platform.system() == 'Windows':
    font_path = "C:/Windows/Fonts/malgun.ttf"
elif platform.system() == 'Darwin':
    font_path = "/System/Library/Fonts/AppleGothic.ttf"
else:
    font_path = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
font_name = font_manager.FontProperties(fname=font_path).get_name()
rc('font', family=font_name)

# 2. 불용어 및 감정어 로딩
with open("stopwords_ko.json", encoding="utf-8") as f:
    stopwords = set(json.load(f))

with open("SentiWord_info.json", encoding="utf-8") as f:
    sentiword = json.load(f)
emotion_dict = {item['word']: float(item['polarity']) for item in sentiword if abs(float(item['polarity'])) >= 0.3}

# 3. 텍스트 로딩
with open("test8.txt", encoding="utf-8") as f:
    lines = f.readlines()

kiwi = Kiwi()
G = nx.DiGraph()
recent_entity = None

# 4. 형태소 분석 함수
def extract_nouns(text):
    return [token.form for token in kiwi.analyze(text)[0][0]
            if token.tag.startswith("N") and token.form not in stopwords and len(token.form) > 1]

# 5. 감정어 추출 및 관계 구성
for line in lines:
    if not line.startswith("내담자 :"):
        continue
    content = line.split(":", 1)[1].strip()
    nouns = extract_nouns(content)
    emos = [token.form for token in kiwi.analyze(content)[0][0] if token.form in emotion_dict]

    for emo in emos:
        subject = "내담자"
        targets = [n for n in nouns if n != subject]
        if not targets:
            targets = [recent_entity] if recent_entity else []
        for target in targets:
            if not target:
                continue
            G.add_node(subject, shape='circle', color='#ADD8E6')     # 내담자: 원형
            G.add_node(target, shape='diamond', color='#87CEFA')     # 인물/원인: 마름모
            G.add_node(emo, shape='square', color='#FFDAB9')         # 감정어: 사각형
            G.add_edge(subject, target)
            G.add_edge(target, emo)
            recent_entity = target

# 6. 시각화
plt.figure(figsize=(16, 10))
pos = nx.spring_layout(G, seed=42)
shape_map = {"circle": "o", "square": "s", "diamond": "D", "octagon": "8"}

for shape in set(nx.get_node_attributes(G, 'shape').values()):
    nodes = [n for n in G.nodes if G.nodes[n]['shape'] == shape]
    nx.draw_networkx_nodes(G, pos, nodelist=nodes,
                           node_shape=shape_map[shape],
                           node_color=[G.nodes[n]['color'] for n in nodes],
                           node_size=1500, alpha=0.8)
nx.draw_networkx_edges(G, pos, arrows=True, arrowstyle='->')
nx.draw_networkx_labels(G, pos, font_size=11)
plt.axis('off')
plt.tight_layout()
plt.show()
