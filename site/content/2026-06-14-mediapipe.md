---
title: MediaPipe 학습 노트
date: 2026-06-14
project: study
tags:
  - MediaPipe
  - 랜드마크
  - 실시간추론
  - 딥러닝
---

# MediaPipe 학습 노트

구글의 실시간 미디어 처리 프레임워크 MediaPipe 개념 정리. 무엇을 하는지, 솔루션 종류, 그래프 구조, 동작 원리(검출+추적), 랜드마크 좌표 읽기, 실전 코드(Python/JS), 커스텀(Model Maker), YOLO와의 차이, 핵심 요약까지.

---

## 1. MediaPipe란?

**MediaPipe**(by Google)는 이미지·영상·오디오 같은 **미디어 스트림을 실시간으로 처리하는 ML 파이프라인 프레임워크**다. 핵심은 두 가지다.

1. **프레임워크** — Calculator(처리 노드)들을 그래프로 연결해 미디어 처리 파이프라인을 만드는 엔진.
2. **솔루션(Tasks)** — 그 위에 미리 만들어 놓은 기성 기능들(손·얼굴·포즈 인식 등). 대부분 사람들이 쓰는 건 이쪽.

YOLO가 "아무 물체나 박스로 찾는" 범용 탐지라면, MediaPipe는 **사람 몸(손·얼굴·자세) 인식에 특화**되어 있고, 그 결과를 박스가 아니라 **랜드마크(키포인트 좌표)** 로 준다.

```
[입력 영상]  →  MediaPipe  →  손 관절 21개 좌표 / 얼굴 468점 / 포즈 33점 …
                              (박스가 아니라 "점들의 위치")
```

**특징 요약**
- **온디바이스(on-device)** — 서버 없이 폰·브라우저·노트북 안에서 처리.
- **실시간·경량** — 모바일·웹에서 수십 FPS 목표. CPU만으로도 동작, GPU 가속 옵션.
- **멀티플랫폼** — Python / JavaScript(Web, WASM) / Android / iOS / C++.
- **멀티모달** — 비전뿐 아니라 오디오·텍스트 Task도 있음.

> 비유: YOLO = "사진에서 물건 찾아 네모 치기", MediaPipe = "사람 손가락 마디·얼굴 윤곽·관절에 점 찍기".

---

## 2. MediaPipe 종류 (Task / Solution)

특화 기능별로 Task가 나뉜다. (구버전 `mediapipe.solutions` API → 신버전 **MediaPipe Tasks API**로 정리되는 중. 개념은 동일.)

| Task | 하는 일 | 출력 |
|------|---------|------|
| **Hand Landmarker** | 손 인식 | 손당 **21개** 관절 랜드마크 |
| **Pose Landmarker** | 전신 자세 | **33개** 신체 키포인트 |
| **Face Landmarker** | 얼굴 메시 | **468개**(홍채 포함 478) 3D 랜드마크 |
| **Face Detector** | 얼굴 위치 | 바운딩 박스 + 6개 키포인트 |
| **Gesture Recognizer** | 손동작 인식 | 손 랜드마크 + 제스처 라벨 |
| **Image Segmenter** | 영역 분할 | 픽셀 마스크(배경 분리 등) |
| **Holistic**(레거시) | 통합 | 얼굴+양손+포즈 한 번에(543점) |
| **Object Detector / Image Classifier** | 범용 탐지·분류 | 박스 / 클래스 (YOLO 영역과 겹침) |

> 비전 외에도 Audio Classifier, Text Classifier, **LLM Inference API** 등 멀티모달 Task가 있다. 다만 MediaPipe의 대표 강점은 **손·얼굴·포즈 랜드마크**다.

---

## 3. 핵심 구조 — 그래프 / Calculator / Packet

MediaPipe 프레임워크의 바닥은 **그래프(Graph)** 다. 데이터가 노드들을 따라 흐르며 가공된다.

```
[영상 프레임]
     │  (Packet: 타임스탬프 붙은 데이터 한 덩어리)
     ▼
┌──────────────┐   Stream    ┌──────────────┐   Stream   ┌──────────────┐
│ Calculator A │ ──────────▶ │ Calculator B │ ─────────▶ │ Calculator C │
│ (전처리/리사이즈)│            │ (모델 추론)    │            │ (랜드마크 디코드)│
└──────────────┘             └──────────────┘            └──────────────┘
```

| 용어 | 뜻 |
|------|-----|
| **Graph** | 처리 파이프라인 전체. 노드와 연결의 집합 |
| **Calculator** | 그래프의 노드 1개 = 한 가지 처리 단위(리사이즈·추론·디코드 등) |
| **Stream** | Calculator를 잇는 데이터 통로 |
| **Packet** | 스트림을 흐르는 데이터 한 단위. **타임스탬프**를 가짐(영상 동기화의 핵심) |

> Task API를 쓰면 이 그래프가 내부에 숨겨져 있어 신경 쓸 필요 없다. 하지만 "왜 실시간 동기화가 잘 되나" = 패킷 타임스탬프 기반 그래프 엔진 덕분이라는 점만 알면 된다.

---

## 4. 동작 원리 — 검출(Detector) + 추적(Tracker)

랜드마크 Task들은 대부분 **2단 파이프라인**으로 동작한다. (Hand·Pose 공통)

```
1) Detector 모델 :  손/사람이 어디 있나 → 관심영역(ROI) 박스 찾기
2) Landmark 모델 :  그 박스 안에서 관절 점들의 정확한 위치 회귀(regression)
```

**핵심 최적화 — 추적(tracking)**: 영상에서 매 프레임 Detector를 돌리면 무겁다. 그래서 한 번 찾은 뒤에는 **이전 프레임의 랜드마크로 ROI를 예측**해 Landmark 모델만 돌리고, **추적을 놓쳤을 때만** Detector를 다시 호출한다.

```
프레임1: [Detector] → ROI → [Landmark] → 21점
프레임2: 이전 21점으로 ROI 예측 → [Landmark]만 실행  ← 빠름
프레임3: 〃
   …
추적 실패(손 사라짐/가림) → [Detector] 다시 실행
```

- Hand = Palm Detector + Hand Landmark. Pose = BlazePose(Detector + Tracker). Face Mesh = 468점 회귀.
- 그래서 **영상이 이미지보다 빠르고 안정적**이다(추적이 작동하므로).

### 좌표계 (중요)
랜드마크 좌표는 보통 **정규화(normalized)** 값이다.

| 값 | 의미 |
|-----|------|
| `x`, `y` | 이미지 너비·높이로 나눈 **0~1** 비율 (해상도 무관) |
| `z` | 깊이(상대값). 작을수록 카메라에 가까움 |
| world landmarks | 미터(m) 단위 3D 좌표(Pose·Hand에서 제공) |

> 픽셀 좌표가 필요하면 `x * 이미지폭`, `y * 이미지높이`로 환산한다.

---

## 5. 랜드마크 인덱스 읽기

좌표는 "몇 번 점이 어디"인지 인덱스로 정해져 있다. 자주 쓰는 것만:

**손(Hand) — 21점**
```
0: 손목(wrist)
4: 엄지 끝      8: 검지 끝
12: 중지 끝     16: 약지 끝     20: 새끼 끝
(각 손가락은 뿌리→끝으로 4마디씩 번호)
```

**포즈(Pose) — 33점 (대표)**
```
0: 코     11/12: 좌/우 어깨
13/14: 좌/우 팔꿈치   15/16: 좌/우 손목
23/24: 좌/우 골반     25/26: 좌/우 무릎     27/28: 좌/우 발목
```

**얼굴(Face Mesh) — 468점**: 눈·입·윤곽·코를 촘촘히 덮는 메시. (홍채 추적 켜면 478점)

> 예: "엄지 끝(4)이 검지 끝(8)보다 위에 있으면 좋아요(👍)" 같은 규칙을 좌표로 직접 판별할 수 있다.

---

## 6. 실전 사용 (코드)

### 6.1 Python — Tasks API (신버전 권장)
```python
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# 1) 모델(.task) 로드
base = python.BaseOptions(model_asset_path="hand_landmarker.task")
options = vision.HandLandmarkerOptions(base_options=base, num_hands=2)
detector = vision.HandLandmarker.create_from_options(options)

# 2) 추론
image = mp.Image.create_from_file("hand.jpg")
result = detector.detect(image)

# 3) 결과 — 손마다 21개 랜드마크
for hand in result.hand_landmarks:
    tip = hand[8]                 # 검지 끝
    print(tip.x, tip.y, tip.z)    # 정규화 좌표
```

### 6.2 Python — Solutions API (레거시, 자료 많음)
```python
import cv2
import mediapipe as mp

hands = mp.solutions.hands.Hands(max_num_hands=2, min_detection_confidence=0.5)
img = cv2.imread("hand.jpg")
res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))  # MediaPipe는 RGB 입력

if res.multi_hand_landmarks:
    for hand in res.multi_hand_landmarks:
        for lm in hand.landmark:
            print(lm.x, lm.y, lm.z)
```

### 6.3 JavaScript — 웹(브라우저)에서 실시간
```javascript
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const vision = await FilesetResolver.forVisionTasks("/wasm");
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: { modelAssetPath: "hand_landmarker.task" },
  runningMode: "VIDEO",
  numHands: 2,
});

// 웹캠 루프에서
const result = handLandmarker.detectForVideo(videoEl, performance.now());
// result.landmarks → 캔버스에 점 그리기
```

> 입력 색공간 주의: MediaPipe는 **RGB**를 기대한다. OpenCV는 BGR이라 변환 필요(`COLOR_BGR2RGB`).

---

## 7. 커스텀 — 직접 학습 가능한가?

핵심 랜드마크 모델(손·얼굴·포즈)은 보통 **그대로 가져다 쓴다**(직접 학습 X). 대신 두 가지 방향으로 "내 것"을 만든다.

### ① 랜드마크 위에 분류기 얹기 (가장 흔함)
MediaPipe가 뽑아준 **좌표를 입력 특징으로** 삼아, 그 위에 규칙/작은 모델을 붙인다.

```
[MediaPipe] → 손 21점 좌표 → [내 분류기] → "가위 / 바위 / 보"
                              (규칙 기반 or 학습된 소형 모델)
```
- "손 흔들기(인사)"처럼 **시간 흐름**이 필요한 동작은, 여러 프레임의 좌표 시퀀스를 모아 판별한다.

### ② Model Maker로 커스텀 (일부 Task)
**MediaPipe Model Maker**로 Gesture Recognizer·Image Classifier·Object Detector 등 일부 Task를 **내 데이터로 파인튜닝**할 수 있다.

### ③ Gesture Recognizer 기본 제스처
별도 학습 없이 바로 인식되는 손동작: 👍 Thumb Up, 👎 Thumb Down, ✌️ Victory, ☝️ Pointing Up, ✊ Closed Fist, 🖐️ Open Palm, 🤟 ILoveYou.

---

## 8. 실행 모드와 성능

Tasks API는 입력 종류에 따라 **실행 모드**를 고른다.

| 모드 | 용도 |
|------|------|
| `IMAGE` | 정지 이미지 1장 |
| `VIDEO` | 영상 프레임(타임스탬프 순서, 추적 활성) |
| `LIVE_STREAM` | 웹캠 등 실시간 스트림(콜백으로 비동기 결과) |

- **on-device** 처리라 네트워크·서버 비용이 없고 지연이 적다.
- 모델은 모바일용 경량(`.task`/`.tflite`)이라 가볍지만, 여러 사람·여러 손을 동시에 잡으면 부담이 커진다 → `num_hands` 등으로 제한.
- 정확도/속도 트레이드오프: `min_detection_confidence`, `min_tracking_confidence`로 조절.

---

## 9. 핵심 요약 ★

### 30초 설명
> "MediaPipe는 구글의 온디바이스 실시간 미디어 처리 프레임워크로, 특히 손·얼굴·자세를 인식해 **박스가 아니라 랜드마크(키포인트 좌표)** 로 돌려줍니다. 내부적으로는 Calculator들을 잇는 그래프 파이프라인이고, 랜드마크 Task는 '검출 → 추적'으로 매 프레임 검출을 피해 실시간 성능을 냅니다."

### 외울 핵심 흐름 5개
**① 온디바이스 실시간 → ② 손·얼굴·포즈 특화 → ③ 출력=랜드마크 좌표 → ④ 검출+추적 파이프라인 → ⑤ 좌표 위에 분류기 얹어 동작 인식**

### 꼬리질문 대비
| 질문 | 한 줄 답 |
|------|----------|
| YOLO와 차이? | YOLO=범용 박스 탐지, MediaPipe=사람 부위 랜드마크 좌표 |
| 출력이 뭔가요? | 정규화(0~1) 키포인트 좌표(x,y,z), 일부는 미터 단위 world 좌표 |
| 왜 실시간이 빠른가? | 매 프레임 검출 대신, 이전 프레임 랜드마크로 추적해 Landmark 모델만 실행 |
| 동작(제스처) 인식은? | MediaPipe가 준 좌표를 특징으로 규칙/소형 모델을 따로 얹어 분류 |
| 커스텀 학습은? | 핵심 모델은 그대로 쓰고, Model Maker로 일부 Task만 파인튜닝 |
| 좌표계는? | x,y는 이미지 대비 0~1 비율, z는 상대 깊이 |

---

## 10. YOLO vs MediaPipe (함께 보기)

| | YOLO | MediaPipe |
|---|---|---|
| 만든 곳 | Ultralytics 등 | Google |
| 핵심 | 범용 객체 탐지(무엇이 어디) | 사람 부위 인식(손·얼굴·포즈) |
| 출력 | 바운딩 박스 + 클래스 | 랜드마크(키포인트 좌표) |
| 커스텀 학습 | ✅ 내 데이터로 자유롭게 | △ 핵심 모델은 기성, 일부만 Model Maker |
| 잘하는 것 | 번호판·제품 검수·개수 세기 | 손동작·자세 교정·얼굴 필터 |

- **함께 쓰기**: YOLO로 사람 영역을 찾고 → 그 안을 MediaPipe로 포즈 분석하는 식으로 조합 가능. (영상 실시간이면 FPS·자원 부담 주의)
- 선택 기준: "아무 물체나 찾고 직접 학습" → YOLO / "사람 손·얼굴·관절을 실시간 좌표로" → MediaPipe.

---

## 11. 확장성 — 필요한 만큼 골라 쓰고, 합쳐 쓰기

랜드마크는 고정된 한 세트로 나오지만, **무엇을 쓸지·무엇과 합칠지는 자유**다. 이게 MediaPipe를 응용하는 핵심.

### 11.1 원하는 점만 골라 쓰기
결과는 인덱스로 접근하는 좌표 배열이라, 필요한 번호만 뽑고 나머지는 무시하면 된다.

```python
result = hand_landmarker.detect(image)
hand = result.hand_landmarks[0]      # 21개 점 배열

WANT = [4, 8]                        # 엄지끝 · 검지끝만 관심
for i in WANT:
    lm = hand[i]
    print(i, lm.x, lm.y)             # 나머지 19개는 안 봐도 됨
```

> 예: 엄지(4)–검지(8) 거리로 꼬집기(pinch) 판별 → 두 점이면 충분.

**주의 — 구분할 것**
- **어떤 점을 쓸지** = 자유롭게 선택 ✅
- **점 개수 자체를 줄이기**(연산 절약) = ❌ 모델이 한 세트를 통째로 출력. 부담을 줄이려면 점이 아니라 `num_hands`·해상도·VIDEO 추적 쪽을 조절한다.

### 11.2 여러 Task의 랜드마크 합쳐 쓰기
Hand·Pose·Face는 독립 Task라, 같은 프레임에 각각 돌려 좌표를 합칠 수 있다.

```python
hand_result = hand_landmarker.detect(image)   # 손 21점
pose_result = pose_landmarker.detect(image)   # 포즈 33점
# Pose 손목(15/16)과 Hand 손목(0)을 이어 "팔 + 손가락"을 한 골격으로 연결
```

- 장점: 필요한 부위만 조합(팔 자세 + 손가락 동작 등).
- 단점: 모델을 여러 개 돌리면 연산 부담↑ → FPS 주의.

### 11.3 Holistic — 한 번에 통합
얼굴 + 양손 + 포즈를 한 파이프라인에서 같이 뽑는 통합 솔루션(총 543점). "전신 + 손동작"을 함께 볼 때 편하다. (구버전 `solutions` API 계열 — 신버전에선 11.2의 개별 조합으로 가는 추세)

| 필요한 것 | 방법 |
|------|------|
| 손가락 디테일만 | Hand Landmarker만 |
| 전신 자세만 | Pose Landmarker만 |
| 팔 자세 + 손가락 동작 | Hand + Pose 조합 |
| 얼굴까지 전부 | Holistic |

> 정리: **점은 골라 쓰고, Task는 합쳐 쓴다.** 핵심 모델을 건드리지 않고도 좌표 조합만으로 응용 범위를 넓힐 수 있다.

---

## 한 줄 결론

> MediaPipe는 결국 **온디바이스에서 사람의 손·얼굴·포즈를 랜드마크 좌표로 뽑아주는 도구**다. 그래프 파이프라인 위에서 '검출+추적'으로 실시간 성능을 내고, 그 **좌표 위에 내 규칙/모델을 얹어** 제스처·자세 판별을 만든다. 박스가 필요하면 YOLO, 키포인트가 필요하면 MediaPipe.
