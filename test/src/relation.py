import json
from konlpy.tag import Okt
import networkx as nx
import matplotlib.pyplot as plt
from matplotlib import font_manager, rc
import platform
from collections import deque

# --- 한글 폰트 설정 ---
if platform.system() == 'Windows':
    font_path = "C:/Windows/Fonts/malgun.ttf"
elif platform.system() == 'Darwin':
    font_path = "/System/Library/Fonts/Supplemental/AppleGothic.ttf"
else:
    font_path = "/usr/share/fonts/truetype/nanum/NanumGothic.ttf"
font_prop = font_manager.FontProperties(fname=font_path)
rc('font', family=font_prop.get_name())

# --- 감정 사전 로딩 ---
with open("SentiWord_info.json", encoding='utf-8') as f:
    senti_dict = json.load(f)

emotion_words = {}
for item in senti_dict:
    try:
        emotion_words[item['word']] = float(item['polarity'])
    except (ValueError, KeyError):
        emotion_words[item['word']] = 0.0

# --- 내담자 대화 로딩 ---
with open("/Users/easyeun/Documents/GitHub/sttTest/test1.txt", "r", encoding="utf-8") as f:
    text = f.read()

# --- 내담자 발화만 추출 ---
lines = text.split('\n')
client_lines = [line.split("내담자 :")[-1].strip() for line in lines if line.startswith("내담자 :")]
client_text = " ".join(client_lines)

# --- 분석 준비 ---
okt = Okt()
pronouns = ['그', '그녀', '너', '재']
person_names = ['친구', '엄마', '아빠', '선생님', '남편', '아내', '형', '동생', '언니', '오빠', '누나']

sentences = client_text.split('.')
recent_person_queue = deque(maxlen=3)
resolved_person_emotions = {}
person_contexts = {}
pronoun_map = {}

# --- 감정 추출 및 대명사 해석 ---
for sent in sentences:
    sent = sent.strip()
    if not sent:
        continue

    nouns = okt.nouns(sent)
    morphs = okt.morphs(sent)
    found_persons = []

    main_persons = [n for n in nouns if n in person_names]
    if main_persons:
        for p in main_persons:
            recent_person_queue.append(p)
        last_person = recent_person_queue[-1] if recent_person_queue else None
        for pro in ['그', '그녀', '재']:
            pronoun_map[pro] = last_person
        pronoun_map['너'] = '상담사'  # '너'는 상담사로 추정

    for noun in nouns:
        if noun in person_names:
            found_persons.append(noun)
        elif noun in pronouns:
            resolved = pronoun_map.get(noun, noun)
            found_persons.append(resolved)
        elif noun == '내담자':
            found_persons.append('내담자')

    if not found_persons:
        found_persons = ['내담자']

    emotions = [w for w in morphs if w in emotion_words]

    for char in set(found_persons):
        if not char:
            continue
        if char not in resolved_person_emotions:
            resolved_person_emotions[char] = []
        resolved_person_emotions[char].extend(emotions)

        if char not in person_contexts:
            person_contexts[char] = []
        person_contexts[char].append(sent)

# --- 관계도 구성 ---
G = nx.DiGraph()
G.add_node('내담자', type='center')

for person, emotions in resolved_person_emotions.items():
    if person == '내담자':
        continue
    G.add_node(person, type='person')
    G.add_edge('내담자', person)

    for emo in set(emotions):
        G.add_node(emo, type='emotion', polarity=emotion_words.get(emo, 0))
        G.add_edge(person, emo)

# --- 시각화 ---
plt.figure(figsize=(11, 9))
pos = nx.spring_layout(G, k=0.6, seed=42)

node_colors = []
node_sizes = []

for node, data in G.nodes(data=True):
    n_type = data.get('type', '')
    if n_type == 'center':
        node_colors.append('#ffd700')  # 노란색
        node_sizes.append(3000)
    elif n_type == 'person':
        node_colors.append('#87ceeb')  # 하늘색
        node_sizes.append(2000)
    elif n_type == 'emotion':
        polarity = data.get('polarity', 0)
        if polarity > 0:
            node_colors.append('#b3e5fc')  # 긍정
        elif polarity < 0:
            node_colors.append('#ff9999')  # 부정
        else:
            node_colors.append('#d3d3d3')  # 중립
        node_sizes.append(1500)

nx.draw_networkx_nodes(G, pos, node_color=node_colors, node_size=node_sizes)
nx.draw_networkx_edges(G, pos, arrowstyle='-|>', arrowsize=15)
nx.draw_networkx_labels(G, pos, font_family=font_prop.get_name(), font_size=11)

# ✅ 제목 출력 명확하게
plt.title("내담자 중심 인물-감정 관계도 (대명사 추론 포함)", fontsize=15, pad=20)
plt.tight_layout()
plt.axis('off')
plt.show()
