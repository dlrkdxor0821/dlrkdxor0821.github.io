---
title: map.pgm_To_Gazebo
date: 2026-06-15
project: ROS2
tags:
  - Gazebo
  - PGM
  - 점유격자
  - SDF
  - 시뮬레이션
---

# map.pgm_To_Gazebo

ROS2의 점유격자 맵(`map.pgm`)을 Gazebo 시뮬레이션 환경(`world.sdf`)으로 변환하는 원리를 정리한다.
실제 구현은 `make_candidate_world.py` 스크립트(PGM → self-contained Gazebo world 변환기)를 기준으로 한다.

핵심 아이디어는 한 줄로 요약된다.

> **PGM 점유 픽셀 → 가로 run으로 묶고 → 세로로 병합해 직사각형으로 분해 → 각 직사각형을 일정 높이 박스로 extrude → world.sdf**

벡터 트레이스가 아니라 **픽셀(래스터)을 직사각형으로 근사**하는 방식이라, 비스듬한 벽은 작은 박스들이 계단처럼 쌓인 형태가 된다. (사람이 직선 벡터로 그리는 traffic_editor / rmf_site와 대비됨)

---

## 0. 입력 — PGM 점유격자

ROS `map_server`가 저장하는 **P5 (binary) PGM**. 픽셀의 밝기로 점유 상태를 표현한다.

- 검정(어두움) = 벽 / 점유(occupied)
- 흰색(밝음) = 빈 공간(free)

함께 있는 `map.yaml`에서 변환에 필요한 메타데이터를 읽는다.

| 필드 | 의미 |
|------|------|
| `resolution` | m/픽셀 (한 픽셀이 몇 미터인지) |
| `origin` | 맵 원점 `(ox, oy)` |
| `free_thresh` | free/occupied 판정 임계값 |

```python
def read_pgm(path):
    # P5 PGM 헤더(magic, width/height, maxval) 파싱 후
    # 본문을 uint8 (h, w) 배열로 읽는다
    ...
    data = np.frombuffer(f.read(), dtype=np.uint8).reshape(h, w)
    return data
```

---

## 1. 점유 픽셀만 골라내기 (이진화)

밝기가 임계값보다 어두운 픽셀을 **벽(점유)** 으로 보고 boolean 마스크를 만든다.

```python
occ_mask = img < int(free_thresh * 255)
```

여기까지는 단순한 흑백 마스크다.

---

## 2. 행마다 가로 덩어리(run) 찾기

각 행(row)을 훑으며 **연속으로 점유된 구간**을 `(시작열, 끝열)`로 묶는다.

```python
def runs_in_row(row):
    # 한 행에서 True가 연속된 구간을 (c0, c) 튜플로 수집
    runs = set()
    c = 0
    while c < len(row):
        if row[c]:
            c0 = c
            while c < len(row) and row[c]:
                c += 1
            runs.add((c0, c))
        else:
            c += 1
    return runs
```

예: 한 행이 `..████..██..` 이면 → `(2,6)`, `(8,10)` 두 개의 run.

---

## 3. 세로로 병합 → 직사각형 분해 (핵심 알고리즘)

위·아래 행에서 **같은 `(시작열, 끝열)` run이 이어지면 하나의 직사각형으로 합친다.**

```
행0:  ████      ← run (0,4) 열림
행1:  ████      ← 같은 run, 계속 진행
행2:  ████      ← 같은 run
행3:  ..        ← run 닫힘 → 사각형 (행0~행3, 열0~4) 확정
```

- 위 행에 있던 run이 다음 행에 없으면 → 사각형을 **닫아서 저장** `(r0, c0, r1, c1)`
- 새 run이 나타나면 → 새 사각형 **열기**

```python
def decompose_to_rects(occ_mask):
    rects = []
    open_rect = {}                 # (c0, c1) -> 시작 행 r0
    for r in range(occ_mask.shape[0]):
        cur = runs_in_row(occ_mask[r])
        for k in [k for k in open_rect if k not in cur]:  # 끝난 run 닫기
            rects.append((open_rect[k], k[0], r, k[1]))
            del open_rect[k]
        for run in cur:            # 새 run 열기
            if run not in open_rect:
                open_rect[run] = r
    for run, r0 in open_rect.items():  # 마지막 행까지 열린 run 마감
        rects.append((r0, run[0], occ_mask.shape[0], run[1]))
    return rects
```

결과: 벽 픽셀 전체가 **겹치지 않는 직사각형 리스트**로 분해된다.

---

## 4. 픽셀 좌표 → 월드 좌표 변환

직사각형의 픽셀 위치를 실제 미터 좌표(중심 `cx,cy` + 크기 `sx,sy`)로 바꾼다.

```python
cx = (c0 + c1) / 2 * res + ox       # 중심 x
cy = (H - (r0 + r1) / 2) * res + oy  # 중심 y  ← 이미지 row 반전
sx = (c1 - c0) * res                 # 가로 크기
sy = (r1 - r0) * res                 # 세로 크기
```

주의할 점 두 가지:

- `resolution`을 곱해 **픽셀 → 미터**, `origin`을 더해 **맵 원점 보정**
- 이미지는 위쪽이 0행이지만 Gazebo y축은 위로 증가 → **`H - row`로 위아래를 뒤집어야** 좌표가 맞는다

---

## 5. 박스로 "위로 세우기" (extrude)

각 직사각형을 일정 높이(예: `WALL_HEIGHT = 0.72m`) 박스로 만들어 SDF에 기록한다. 2D 평면 사각형을 z축으로 끌어올리는(extrude) 단계다.

```xml
<collision name="wall_0000">
  <pose>{cx} {cy} 0.36 0 0 0</pose>            <!-- z = 높이/2 -->
  <geometry><box><size>{sx} {sy} 0.72</size></box></geometry>
</collision>
<visual name="wall_0000_v">
  <pose>{cx} {cy} 0.36 0 0 0</pose>
  <geometry><box><size>{sx} {sy} 0.72</size></box></geometry>
</visual>
```

여기에 바닥(`ground_plane`), 조명(`sun`), 물리/센서 플러그인까지 인라인으로 붙여 **self-contained `world.sdf`** 를 완성한다. `model://` 외부 리소스 경로가 필요 없어 그대로 띄울 수 있다.

---

## 정리

| 단계 | 입력 → 출력 | 함수 |
|------|-------------|------|
| 0 | PGM/yaml 읽기 | `read_pgm` |
| 1 | 이진화 (점유 마스크) | `occ_mask = img < free_thresh*255` |
| 2 | 행별 가로 run | `runs_in_row` |
| 3 | 세로 병합 → 직사각형 | `decompose_to_rects` |
| 4 | 픽셀 → 월드 좌표 | `pix_rect_to_world` |
| 5 | 직사각형 → 박스 extrude | `build_world_sdf` |

이 방식은 **RMF 없이 충돌체·라이다 매칭 검증용 시뮬 환경**을 빠르게 만드는 데 적합하다.
RMF 관제(차선·웨이포인트·문·엘리베이터)까지 필요하면 traffic_editor / rmf_site로 벡터 맵(`building.yaml`)을 따로 만들어 nav graph를 생성해야 한다.
