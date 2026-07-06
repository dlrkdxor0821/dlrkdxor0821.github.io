---
title: 기술조사 - 추종
date: 2026-07-06
project: Arte Project Team
tags:
  - 추종
  - 인지
  - 추적
  - ReID
  - Nav2
  - following
---

# 기술조사 - 추종

> 대상을 **인지 → 추적 → 지속학습 → 추종 주행**으로 이어가는, 추종과 직접 관계된 기술 정리.
> 각 기술의 **정확한 영문 명칭** + 무엇 / 언제 / 장점 / 단점.

---

## 목차
1. [인지·추적 (Perception & Tracking)](#1-인지추적-perception--tracking)
2. [프레임 지속학습 (Online Continual Learning)](#2-프레임-지속학습-online-continual-learning)
3. [추종 제어 (Following Control)](#3-추종-제어-following-control)
4. [추종에 중요한 기술 — 웹 리서치](#4-추종에-중요한-기술--웹-리서치-20242026)
5. [Nav2 Dynamic Object Following](#5-nav2-dynamic-object-following)
6. [참고 자료](#참고-자료-sources)

---

## 1. 인지·추적 (Perception & Tracking)
> 대상을 잡고 프레임 간 유지

### YOLO (You Only Look Once) — 객체 탐지
- **무엇** — 이미지를 신경망에 한 번 통과시켜 bbox·클래스·신뢰도를 동시에 예측하는 실시간 1-stage 탐지기. 구현 예: `YOLOv8n`, `YOLO11n-seg` (Ultralytics).
- **언제** — 매 프레임 추종 대상 후보를 찾는 파이프라인 입구.
- **장점** — 실시간(단일 forward) · 엣지/GPU 유연 · 커스텀 학습 쉬움.
- **단점** — 원거리·가림 대상 놓침 · "누구"인지는 모름(재식별 필요).

### ByteTrack / IoU Tracker — 다중 객체 추적 (Multi-Object Tracking, MOT)
- **무엇** — 탐지를 프레임 간 연결해 각 대상에 일관된 `track_id`를 부여.
  - **ByteTrack** : 저신뢰 박스까지 2단계로 매칭하는 SOTA 트래커.
  - **IoU Tracker** : bbox 겹침 비율(Intersection-over-Union)만으로 매칭하는 초경량 방식.
- **언제** — 탐지 직후, 대상 궤적을 잇고 잠금 대상 ID를 유지할 때.
- **장점** — ByteTrack: 가림에 강함 · IoU Tracker: 초경량·외형모델 불필요.
- **단점** — 순수 모션 기반 → 급이동·긴 가림에 ID 스위치 · 카메라 이동에 취약(→ BoT-SORT).

### OSNet (Omni-Scale Network, torchreid) — 사람 재식별 (Person Re-Identification, ReID)
- **무엇** — 옷·체형을 고정 길이 임베딩으로 인코딩해 **코사인 유사도(cosine similarity)**로 동일 대상 판별하는 경량 CNN.
- **언제** — 여러 후보 중 "그 대상"을 골라 track 유지, 재등장 시 재식별.
- **장점** — 개별 외형 식별(경량) · 조명에 어느정도 강인.
- **단점** — 고정 모델 → 새 시점(뒷모습) 일반화 약함 · 비슷한 옷 혼동 · 학습 도메인 의존.

### InsightFace (RetinaFace + ArcFace, `buffalo_l`) — 얼굴 인식 (Face Recognition)
- **무엇** — 얼굴 검출(RetinaFace) + 인식(ArcFace)을 합친 팩. 512-d 얼굴 임베딩으로 신원 확정.
- **언제** — 추종 시작 시 대상을 정확히 잠글 때(이후 몸통 ReID로 이어가는 2단 전략).
- **장점** — 얼굴=개인 고유 → 오식별 매우 낮음 · 혼잡 중 초기 잠금 신뢰↑.
- **단점** — 얼굴 보여야 함(뒤돌면 무용) · 거리·해상도 민감 · VRAM 부담.

### HSV Color Histogram — 색상 히스토그램 매칭
- **무엇** — Hue·Saturation·Value 분포를 히스토그램으로 집계하고 상관계수로 비교하는 고전 CV 기법.
- **언제** — 딥러닝 ReID와 **AND 조건**으로 묶어 오인식을 줄일 때.
- **장점** — 매우 가벼움 · 조명변화 상대적 강인 · 색이 뚜렷한 대상에 효과.
- **단점** — 비슷한 색이면 구분 불가 · 형태 정보 없음 · 배경색 오염.

### MediaPipe BlazePose — 포즈 추정 기반 사람 검증 (Pose Estimation)
- **무엇** — 사람 33개 관절을 추정하는 경량 포즈 모델. bbox 안에 진짜 사람 keypoint가 있는지 검증.
- **언제** — 탐지 후 재식별 전, 마네킹·의자 등 사물 오추종을 차단.
- **장점** — 사물 오추종 방지 · CPU 경량.
- **단점** — 원거리·가림서 keypoint 실패 · 사람 아닌 대상엔 부적합.

### Stereo Depth (Intel RealSense D435) / Monocular Size Cue — 거리 추정 (Depth Estimation)
- **무엇** — 추종 거리 측정.
  - **Stereo Depth (RealSense D435)** : 능동 IR 스테레오로 픽셀별 실측 mm 거리.
  - **Monocular Size Cue** : 깊이센서 없이 `√(bbox 면적)`으로 거리 대용.
- **언제** — 대상까지 거리로 접근·정지·모드 전환을 결정.
- **장점** — Stereo: 실제 거리·배경 마스킹 · Monocular: 센서 불필요·초저비용.
- **단점** — Stereo: 실외 IR 취약·비용 · Monocular: 대상 자세·크기 변화에 오차, 절대거리 아님.

### Alpha-Beta Filter / EMA (Exponential Moving Average) — 상태 추정·예측 (State Estimation)
- **무엇** — 칼만 필터의 경량판으로 위치·속도를 추정해 잡음 평활 + 미래 예측(Alpha-Beta), 또는 지수이동평균으로 값 평활(EMA).
- **언제** — 지연 보상·순간 유실·bbox 튐을 완화해 제어 입력을 매끄럽게.
- **장점** — 매우 가벼움 · 지연 은닉 · 튐 억제 → 부드러운 추종.
- **단점** — 급기동 예측 부정확 · 지연 ↔ 반응성 트레이드오프.

### Track Coasting / Last-Known-Direction (LKD) — 유실 방향 예측 관성 추종
- **무엇** — 대상이 프레임 밖으로 사라졌을 때, **마지막 관측 속도로 위치를 앞으로 외삽(motion extrapolation / dead reckoning)**해 잠시 그 방향을 계속 향하고(=track coasting), 완전 유실 시엔 **마지막 본 방향(Last-Known-Direction)으로 먼저 회전·탐색**하는 기법. "사라진 쪽으로 살짝 예측해 따라가는" 동작.
  - **Track Coasting** : Alpha-Beta/Kalman의 예측(predict) 단계를 측정 없이 몇 프레임 이어감 → 속도 방향으로 관성 유지 (신뢰도를 낮춰 제한).
  - **Last-Known-Direction Search** : 유실 시 본체/카메라를 대상이 이탈한 쪽으로 먼저 돌려 재탐색(왼쪽으로 사라지면 왼쪽 먼저).
- **언제** — 순간 가림·프레임 이탈 직후, 완전 재탐색(Search)으로 넘어가기 전의 짧은 구간.
- **장점** — 순간 유실을 부드럽게 넘김 · 사라진 방향을 향해 재획득 확률↑ · 튐 없는 연속 추종.
- **단점** — 대상이 방향을 급전환하면 헛따라감(overshoot) · 오래 유지하면 발산 → **짧은 시간/프레임으로 제한 필수**.

---

## 2. 프레임 지속학습 (Online Continual Learning)
> 추종 중 외형 변화 적응 — 돌아서도 놓치지 않기

### Online Continual Learning (OCL) — 갤러리 확장 방식 ⭐
- **무엇** — 추종하는 동안 대상의 **새 각도(옆·뒷모습) 특징 벡터**를 갤러리(gallery)에 계속 축적하는 온라인 지속학습. 30프레임마다 기존과 `유사도 < 0.94`일 때만(=충분히 새 각도) 추가, 최대 50장. 매칭은 갤러리 전체 중 최고 유사도.
- **언제** — 대상이 몸을 돌려 외형이 급변하는 동안 재식별을 유지할 때(뒷모습 대응).
- **장점** — 측면·뒷모습 커버 · 모델 재학습 없이 저비용 세션 적응.
- **단점** — 모델 고정이라 근본 한계 · 품질 게이트 없으면 노이즈 오염(drift) 위험.
- **분류** — 표준 알고리즘/라이브러리가 아닌 **직접 구현 (custom, gallery/exemplar-based heuristic)**. 모델 가중치는 고정하고 특징 벡터만 은행처럼 축적.

```python
# 추종 중 매 프레임 — 갤러리 온라인 확장
if frame % CALIBRATION_INTERVAL(=30) == 0:
    sims = [cosine(g, feat) for g in gallery]
    if max(sims) < CALIBRATION_ADD_THRESHOLD(=0.94)  # 기존과 다른 각도(옆·뒤)
       and len(gallery) < MAX_GALLERY_SIZE(=50):
        gallery.append(feat)                          # 새 외형 벡터 축적
# 매칭: reid_sim = max(cosine(g, cand) for g in gallery)
```

### Asymmetric Hysteresis + Distance Continuity — 관대한 유지 (대안)
- **무엇** — 갤러리 확장 없이, 한 번 잠그면 유지 임계값을 `0.20`까지 낮추고(뒷모습이라 유사도가 떨어져도 lock 유지) 거리 점프 `< 1000mm`로 엉뚱한 대상을 배제하는 방식.
- **언제** — 학습 없이 뒤돌아섬을 견딜 때(얼굴 잠금의 신뢰를 활용).
- **장점** — 구현 간단 · 연산 0 · 급락한 매칭 흡수.
- **단점** — 너무 관대하면 엉뚱한 대상 흡수 · 학습이 아니라 근본 적응은 안 됨.

---

## 3. 추종 제어 (Following Control)
> 인지 결과 → 실제 주행 명령

### Proportional Control (P-control) — 비례 제어
- **무엇** — 오차에 비례해 명령을 내는 기본 피드백 제어 (`u = Kp · e`). bbox 중심오차 → 회전, 거리오차 → 전진 속도.
- **언제** — 인지 결과를 즉시 주행 명령으로 바꾸는 기본 추종 루프.
- **장점** — 단순·안정·튜닝 쉬움 · 실시간·저연산.
- **단점** — 정상상태 오차(steady-state error) · 예측 없음 · 큰 지연/비선형에 진동.

### Distance-based Hybrid Control (STOP / Reactive / Nav2) — 거리 기반 하이브리드
- **무엇** — 거리 구간별 제어 전환: `<0.8m` 정지(STOP) · `0.8–1.5m` 반응 P제어(Reactive) · `>1.5m` 전역 경로계획(Nav2).
- **언제** — 근거리 안전정지와 원거리 장애물 회피 주행을 모두 필요로 할 때.
- **장점** — 근거리 안전 + 원거리 경로계획 겸비 · 상황별 최적 거동.
- **단점** — 모드 경계 flapping(히스테리시스 필요) · 튜닝 복잡 · Nav2 지연.

### Command Smoothing: EMA / Hysteresis / Slew-rate Limiting — 명령 안정화
- **무엇** — 지수평활(EMA)·경계 flapping 방지(Hysteresis)·급가속 제한(Slew-rate limiting)으로 주행 명령을 다듬는 기법 묶음.
- **언제** — 제어 출력의 튐·진동·급가속을 억제해 하드웨어에 안전하게 넣을 때.
- **장점** — 부드러운 추종 · 진동 제거 · 모터/기구 보호.
- **단점** — 반응성 저하 · 지연 추가 · 과하면 굼뜬 추종.

### Target-Loss Recovery & Search — 유실 복구·재탐색
- **무엇** — 대상 소실 시 재획득 행동: 카메라 PAN 스윕 → 본체 회전 → 마지막 방향/음성 힌트, 또는 일정 프레임 후 회전 탐색(Search).
- **언제** — 가림·급회전으로 대상을 완전히 놓쳤을 때 복구.
- **장점** — 재획득률↑ · 마지막 방향 활용 · 운영자 힌트 개입 가능.
- **단점** — 탐색 중 추종 정지 · 잘못된 재획득(다른 대상) 위험.

---

## 4. 추종에 중요한 기술 — 웹 리서치 (2024–2026)
> 현 스택을 넘어서는 후보. 난이도 = 도입 난이도.

| 기술 (영문 명칭) | 무엇 · 언제 | 장점 | 단점 | 난이도 | 출처 |
|---|---|---|---|---|---|
| **BoT-SORT** (with ReID) | ByteTrack + 광학흐름(optical-flow) 카메라 모션 보정 + ReID. 카메라가 움직이는 추종 로봇용. | 이동 카메라 ID 안정 · `botsort.yaml` 한 줄 교체 | ByteTrack보다 무거움 · ReID 연산 추가 | 🟢 쉬움 | [ultralytics](https://docs.ultralytics.com/modes/track) |
| **Online Continual Learning ReID** (model-based) | 추종 중 특징추출기 **모델 자체**를 온라인 미세학습(단기+장기 memory manager로 망각 방지). | 갤러리 한계 극복(모델이 적응) · 뒷모습·조명 근본 대응 | 구현 복잡 · 온보드 학습 비용 · 망각/과적합 관리 | 🔴 높음 | [arXiv:2309.11727](https://arxiv.org/abs/2309.11727) |
| **Human Motion Prediction** (Kalman / UKF trajectory forecasting) | 대상의 미래 궤적·자세를 예측. 가림·코너·군중에서 미리 대비. | 가림 중에도 위치 추정 · 충돌 예방·선행 추종 | 장기 예측 불확실 · 모델 복잡 | 🟡 중간 | [Human-Following](https://spj.science.org/doi/10.34133/cbsystems.0085) |
| **Online Boosting Target Identification** (Convolutional Channel Features) | 온라인 부스팅으로 비슷하게 생긴 사람들 중 타깃 구분. 유사 외형(교복 등) 환경. | 온라인 적응 · 유사외형 판별 특화 · 경량 | 배경/유사도 급변에 drift · 고전기법 한계 | 🟡 중간 | [Online Boosting RPF](https://pmc.ncbi.nlm.nih.gov/articles/PMC9658503/) |
| **2D LiDAR Leg Detection** | 라이다 스캔에서 사람 다리 패턴 검출. 저조도·역광·근거리 보조. | 조명 무관 · 저연산 · 360° · 근거리 견고 | 의자다리 등 오검 · 신원 구분 불가 | 🟡 중간 | [RPF 개관](https://www.emergentmind.com/topics/robot-person-following-rpf) |
| **RGB-D Fusion** | 색상 + 깊이 결합으로 복잡 배경·다중 가림에서 고정밀 인식. | 배경 분리 + 거리 동시 · 복잡 환경 강인 | 실외 depth 취약 · 센서 비용 · 정합 필요 | 🟡 중간 | [person_following ROS](https://github.com/koide3/monocular_person_following) |
| **Social Navigation** (Deep RL / Potential Field) | 군중·사회적 규범 고려 경로. 혼잡·동적 환경 추종. | 사람 회피·자연스러움 · 혼잡 견고 | 학습·튜닝 비용 · 시뮬–실물 갭 | 🟡 중간 | [Adap-RPF](https://arxiv.org/pdf/2510.11308) |
| **Foundation-model ReID** (CLIP-ReID · SOLIDER · TransReID) | 대규모 사전학습 ReID — 비전-언어(CLIP-ReID), 부위-인지(SOLIDER), Transformer(TransReID). | 새 시점·조명 강인 · 부분 가림에 강함 | 백본 무거움(엣지 부적합) · 도입 복잡 | 🟡 중간 | [SOLIDER-REID](https://github.com/tinyvision/SOLIDER-REID) |

> **추종의 3대 난제**(리서치 공통): ① 가림(occlusion) 복구 ② 타깃 재식별(re-identification) ③ 혼잡·동적 환경 주행.
> 최신 흐름 = **모션 예측(motion prediction) + 센서 융합(sensor fusion) + 온라인 학습(online learning)** 결합.

---

## 5. Nav2 Dynamic Object Following

### 왜 Nav2인가?
P-control은 "보이는 대상 쪽으로 직선 반응"만 하므로 **벽·기둥·코너에 막히면 추종이 끊긴다.** Nav2는 **전역 경로계획(global planning) + 지역 장애물 회피(local costmap)**를 하므로 대상이 장애물 뒤로 돌아가도 우회해서 따라간다. → **근거리는 P-control, 원거리는 Nav2** 하이브리드가 정석.

Nav2 공식 방식은 **Dynamic Object Following** — Behavior Tree의 `GoalUpdater` + `TruncatePath` 조합.

### 아키텍처
```
perception → /goal_update (PoseStamped) → GoalUpdater → ComputePathToPose → TruncatePath → FollowPath → /cmd_vel   ↻ 1Hz 루프
```

### 구현 4단계
1. **대상 pose를 map 좌표로 `/goal_update`에 발행** — perception이 대상 위치를 `geometry_msgs/PoseStamped`로 publish. (bbox 방위각 + depth/LiDAR 거리 → base_link pose → `tf2`로 map 변환.)
2. **추종용 Behavior Tree(`follow_point.xml`) 적용** — `GoalUpdater`가 `/goal_update`의 최신 pose로 goal을 계속 교체, `TruncatePath`가 경로 끝을 잘라 **대상 앞 일정 거리에서 정지**(사람과 충돌 방지). `KeepRunningUntilFailure`로 무한 추종.
3. **Nav2 파라미터 설정** — `bt_navigator`의 `default_nav_to_pose_bt_xml`을 follow_point.xml로 지정. 컨트롤러는 **Regulated Pure Pursuit (RPP)** 추천, 동적 장애물 많으면 **MPPI (Model Predictive Path Integral)**.
4. **`NavigateToPose` 액션 한 번만 트리거** — 초기 goal 하나만 보내면 BT가 무한 루프를 돌며 GoalUpdater가 최신 대상 pose로 계속 갱신 → **한 번 트리거로 계속 따라감**.

### Behavior Tree — `follow_point.xml`
```xml
<root main_tree_to_execute="MainTree">
  <BehaviorTree ID="MainTree">
    <PipelineSequence name="FollowTarget">
      <!-- 1Hz 마다 최신 대상 pose로 재계획 -->
      <RateController hz="1.0">
        <Sequence>
          <!-- /goal_update 토픽의 최신 pose로 goal 교체 -->
          <GoalUpdater input_goal="{goal}" output_goal="{updated_goal}">
            <ComputePathToPose goal="{updated_goal}" path="{path}" planner_id="GridBased"/>
          </GoalUpdater>
          <!-- 대상 앞 1.0m 에서 멈추도록 경로 끝을 자름 -->
          <TruncatePath distance="1.0" input_path="{path}" output_path="{truncated_path}"/>
        </Sequence>
      </RateController>
      <KeepRunningUntilFailure>
        <FollowPath path="{truncated_path}" controller_id="FollowPath"/>
      </KeepRunningUntilFailure>
    </PipelineSequence>
  </BehaviorTree>
</root>
```

### 핵심 Behavior Tree 노드
| 노드 (영문) | 역할 | 포인트 |
|---|---|---|
| **GoalUpdater** | `/goal_update` 토픽을 구독해 goal을 최신 대상 pose로 교체 | 추종의 심장 — perception이 여기에 계속 발행 |
| **RateController** | 지정 주기로만 재계획(ComputePathToPose 호출) | `hz=1.0` — 반응성 ↔ 부하 조절 |
| **TruncatePath** | 경로 끝(대상 근처)을 잘라 **일정 거리 유지** | `distance=1.0m` = 대상 앞 정지 여백 |
| **FollowPath** | 잘린 경로를 컨트롤러로 추종 | `controller_id` = RPP / MPPI |

### 튜닝 · 주의사항
**장점**
- 벽·기둥·코너를 **우회**해서 추종(전역 경로)
- 지역 costmap으로 **동적 장애물 회피**
- goal 한 번 트리거로 무한 추종
- Nav2 표준·검증된 스택 재사용

**단점·주의**
- 재계획 주기만큼 **반응 지연** → 근접추종은 P-control이 나음
- ⚠️ **대상(사람)을 costmap 장애물로 넣으면 안 됨** (자기 goal을 못 감) → perception에서 필터
- 좁은 실내 밀착추종엔 과함
- costmap·inflation 튜닝 필요

> **권장 하이브리드:** `<0.8m` 근접은 P-control(반응 빠름), `0.8~1.5m` 반응 추종, `>1.5m`부터 Nav2.

### 신형 대안 — Nav2 Following Server (Jazzy+)
최신 Nav2엔 도킹 서버와 같은 `SmoothControlLaw`를 쓰는 **전용 Following 액션 서버**(`opennav_following`)와 BT 노드 `<FollowObject pose_topic="/target_pose"/>`가 추가됐다. 전역 경로계획 없이 **dynamic pose에 직접 servoing**하므로 반응이 빠르고 근접 추종에 유리 — 위 BT 방식(전역 회피)과 상보적이다. 버전 지원을 확인하고 선택.

---

## 참고 자료 (Sources)
- [Nav2 — Dynamic Object Following 튜토리얼](https://docs.nav2.org/tutorials/docs/navigation2_dynamic_point_following.html)
- [Nav2 — Follow Dynamic Point BT (follow_point.xml)](https://docs.nav2.org/behavior_trees/trees/follow_point.html)
- [Nav2 — GoalUpdater 노드](https://docs.nav2.org/configuration/packages/bt-plugins/decorators/GoalUpdater.html)
- [Person Re-ID for Robot Person Following with Online Continual Learning (arXiv:2309.11727)](https://arxiv.org/abs/2309.11727)
- [Human-Following w/ Incomplete Observation (occlusion)](https://spj.science.org/doi/10.34133/cbsystems.0085)
- [Online Boosting Target Identification (RPF)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9658503/)
- [Adap-RPF — crowded environments](https://arxiv.org/pdf/2510.11308)
- [koide3/monocular_person_following (ROS)](https://github.com/koide3/monocular_person_following)
- [Socially-Aware Following (Deep RL + Potential Field)](https://arxiv.org/pdf/2109.01874)
- [Ultralytics Tracking (ByteTrack / BoT-SORT)](https://docs.ultralytics.com/modes/track)
- [SOLIDER-REID](https://github.com/tinyvision/SOLIDER-REID)
