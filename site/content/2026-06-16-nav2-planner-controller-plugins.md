---
title: Nav2 Planner·Controller 플러그인 심층 분석 — 종류·작동원리·장단점
date: 2026-06-16
project: Nav2
tags:
  - Nav2
  - Planner
  - Controller
  - NavFn
  - SmacPlanner
  - DWB
  - RegulatedPurePursuit
  - MPPI
  - plugin
---

# Nav2 Planner·Controller 플러그인 심층 분석

> Planner Server와 Controller Server는 **플러그인 방식**이라 알고리즘을 갈아끼울 수 있다.
> 각 서버별로 **요약표 → 플러그인별 (작동원리 · 언제 · 장단점)** 순서로 분석한다.
> (전체 Nav2 구조는 [[2026-06-16-nav2-pkg]], 추종 제어 감각은 [[2026-06-16-pid-controller]])

---

## 🗺️ Part 1. Planner Server — 전역 경로 플러그인

### 한눈에 보기

| 플러그인 | 알고리즘 | 상태공간 | 기구학 고려 | 속도 | 적합 로봇 |
|---|---|---|---|---|---|
| **NavFn** | Dijkstra/A* (wavefront) | (x, y) | ❌ | ⚡빠름 | 원형·차동 |
| **Smac 2D** | 2D A* + 스무딩 | (x, y) | ❌ | ⚡빠름 | 원형·홀로노믹 |
| **Smac Hybrid-A\*** | Hybrid-A* | (x, y, **θ**) | ✅ | 🐢무거움 | **차량형(Ackermann)** |
| **Smac Lattice** | State Lattice | (x, y, θ) + footprint | ✅ | 🐢무거움 | **비원형·특이형상** |
| **Theta\*** | Any-angle A* | (x, y) | ❌ | 보통 | 개방공간 |

---

### ▸ NavFn (`nav2_navfn_planner::NavfnPlanner`)
- **작동원리**: 목표 지점에서 **비용 파동(wavefront)을 전 격자로 전파**(Dijkstra식)한 뒤, 그 비용 경사(gradient)를 거꾸로 타고 내려와 경로를 뽑는다. `use_astar:true`면 목표 지향 휴리스틱(A*)으로 탐색 범위를 줄인다. → [[2026-06-16-nav2-pkg]] Part 5.
- **언제**: 제자리 회전 되는 **원형/차동 로봇 + 실내 소형 맵**. 빠르게 굴리고 싶을 때 첫 선택.
- **장점**: 단순·빠름·안정적, 튜닝할 게 거의 없음, 미지영역 통과(`allow_unknown`).
- **단점**: **로봇 기구학(회전반경) 완전 무시** → 차량형엔 못 씀. 경로가 격자에 묶여 살짝 각지고 벽에 붙는 경향.

### ▸ Smac 2D (`nav2_smac_planner::SmacPlanner2D`)
- **작동원리**: 정통 **2D A*** (8-connected) + 비용함수(거리+장애물 페널티). NavFn보다 현대적 구현이고 **경로 스무더 내장**.
- **언제**: 원형/홀로노믹 로봇에서 NavFn보다 매끈한 경로를 원할 때.
- **장점**: 빠르면서 경로 품질이 NavFn보다 좋음.
- **단점**: 여전히 **점(point) 로봇 가정** — 방향·기구학 미반영.

### ▸ Smac Hybrid-A* (`nav2_smac_planner::SmacPlannerHybrid`)
- **작동원리**: 상태에 **방향 θ를 추가**(x, y, θ). 차량 운동모델(**최소 회전반경**, 전진/후진)을 지키는 **motion primitive**로만 노드를 확장하고, 목표 근처에선 **Dubins/Reeds-Shepp 곡선**으로 해석적 연결(analytic expansion).
- **언제**: **Ackermann/car-like(앞바퀴 조향)**, 비홀로노믹, **후진이 필요한** 로봇.
- **장점**: 실제로 **주행 가능한(kinematically feasible)** 경로 — 그대로 따라가면 된다.
- **단점**: 무겁고 느림, 파라미터 많고 튜닝 까다로움(회전반경·primitive 해상도 등).

### ▸ Smac State Lattice (`nav2_smac_planner::SmacPlannerLattice`)
- **작동원리**: **오프라인에서 미리 생성한 motion primitive 집합(lattice)**으로 그래프 탐색. 로봇의 **실제 footprint(형상)**까지 충돌 검사에 반영.
- **언제**: **비원형·특이 형상** 로봇, 특정 기동 제약(예: 특수 차량)을 정밀히 지켜야 할 때.
- **장점**: 임의 형상·기구학을 가장 정밀하게 반영.
- **단점**: primitive 파일 생성·설정이 복잡, 무거움. 일반 로봇엔 과함(overkill).

### ▸ Theta* (`nav2_theta_star_planner::ThetaStarPlanner`)
- **작동원리**: A* 변형. 부모를 격자 이웃으로 제한하지 않고 **시야(line-of-sight)가 트이면 직접 연결** → 격자 계단식 지그재그 없는 **임의 각도 직선** 경로.
- **언제**: **개방 공간**에서 자연스러운 직선 경로를 원할 때.
- **장점**: 짧고 자연스러운 경로(불필요한 꺾임 제거).
- **단점**: LOS 체크 비용, 기구학 무시.

> **Planner 선택 의사결정**: 제자리 회전 됨(차동·원형) → **NavFn/Smac2D** · 차처럼 조향 → **Smac Hybrid** · 특이 형상 → **Lattice** · 넓은 개방공간 직선 → **Theta\***.

---

## 🚗 Part 2. Controller Server — 경로 추종 플러그인

### 한눈에 보기

| 플러그인 | 방식 | 동적 회피 | 계산 부하 | 튜닝 난이도 | 적합 |
|---|---|---|---|---|---|
| **DWB** | 속도 샘플링 + critic 점수화 | 중 | 중 | 어려움(critic多) | 범용, 세밀제어 |
| **RPP** | 기하 Pure Pursuit + 규제 | 약 | ⚡낮음 | 쉬움 | 차동, 단순·견고 |
| **MPPI** | 샘플링 MPC(예측제어) | **강** | 🐢높음 | 중~높음 | **고품질·동적환경** |
| **Rotation Shim** | 회전 후 위임(래퍼) | — | 낮음 | 쉬움 | 출발 정렬 보조 |
| **Graceful** | 제어 법칙(자세 수렴) | 약 | 낮음 | 중 | 도킹·정밀정렬 |

---

### ▸ DWB (`dwb_core::DWBLocalPlanner`)
- **작동원리**: **Dynamic Window** — 현재 속도에서 도달 가능한 `(v, ω)` 속도 후보들을 샘플링 → 각각 짧은 미래 궤적을 시뮬레이션 → **여러 critic**(목표거리·경로정렬·장애물·진동 등)으로 점수화 → 최고점 속도를 명령.
- **언제**: 복잡한 환경에서 **행동을 세밀하게 조형**하고 싶을 때(차동·홀로노믹).
- **장점**: critic 가중치로 유연하게 튜닝, 오래 검증된 안정성.
- **단점**: **critic 가중치가 많아 튜닝이 어려움**, 후진/제자리 회전 약하고 좁은 곳에서 보수적.

### ▸ RPP (`nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController`)
- **작동원리**: 경로 위 **Lookahead Point**를 향하는 **원호 곡률**을 계산해 따라감 + 안전 규제(급커브·장애물 근접 시 감속, 큰 방향차면 rotate-to-heading). → [[2026-06-16-nav2-pkg]] Part 4 + [[2026-06-16-pid-controller]].
- **언제**: **차동구동**에서 단순하고 견고한 추종을 원할 때, 좁은 복도.
- **장점**: 단순·직관·견고, **튜닝 쉬움**, 예측 가능한 거동.
- **단점**: **능동적 동적 장애물 회피가 약함**(경로 추종 위주) — 회피는 costmap+감속에 의존.

### ▸ MPPI (`nav2_mppi_controller::MPPIController`)
- **작동원리**: **Model Predictive Path Integral** — 매 주기 **수천 개의 제어 시퀀스를 노이즈로 샘플링** → 각각 미래를 롤아웃 → 비용함수(critic: 경로추종·장애물·속도 등)로 **가중 평균** → 최적 제어 도출. CPU 병렬로 동작.
- **언제**: **부드러움·고품질 주행**, 동적 장애물이 많은 환경, 다양한 기구학(차동·옴니·Ackermann).
- **장점**: 매끄럽고 **예측적인 똑똑한 회피**, 기구학 유연, 요즘 추천 1순위.
- **단점**: **계산 부하 높음**(CPU 여유 필요), 파라미터 많아 튜닝에 학습곡선, 제어주파수 확보 필수.

### ▸ Rotation Shim (`nav2_rotation_shim_controller::RotationShimController`)
- **작동원리**: 새 경로 시작 시 로봇 방향이 경로와 크게 어긋나면 **먼저 제자리 회전**시키고, 정렬되면 **본 컨트롤러(DWB/MPPI 등)로 위임**하는 **래퍼**.
- **언제**: 출발 시 **큰 호를 그리며 휘어 나가는 것**을 막고 싶을 때(특히 DWB와 조합).
- **장점**: 자연스러운 출발, 초기 충돌 위험↓.
- **단점**: **단독 사용 불가** — 반드시 primary controller와 조합 전제.

### ▸ Graceful (`nav2_graceful_controller::GracefulController`)
- **작동원리**: 운동학 기반 **부드러운 제어 법칙(control law)**으로 목표 **자세(pose)에 우아하게 수렴**.
- **언제**: **도킹·정밀 자세 정렬**(목표 방향까지 딱 맞춰야 할 때).
- **장점**: 매우 부드럽고 우아한 접근.
- **단점**: 일반 장거리 주행/적극 회피엔 부적합.

> (참고: **TEB**(Timed Elastic Band)는 core Nav2가 아닌 커뮤니티 플러그인이지만 차량형에서 많이 쓴다.)

> **Controller 선택 의사결정**: 단순·견고(차동) → **RPP** · 고품질·동적환경 → **MPPI** · 행동 세밀튜닝 → **DWB**(+**Rotation Shim**) · 도킹 → **Graceful**.

---

## Part 3. 교체 방법 (params의 `plugin:` 한 줄)

```yaml
planner_server:
  ros__parameters:
    planner_plugins: ["GridBased"]
    GridBased:
      plugin: "nav2_smac_planner::SmacPlannerHybrid"   # ← 이 줄만 바꾸면 교체

controller_server:
  ros__parameters:
    controller_plugins: ["FollowPath"]
    FollowPath:
      plugin: "nav2_mppi_controller::MPPIController"     # ← 여기도
```

---

## 한 줄 요약

> **Planner는 "기구학"으로 고른다**(점 로봇이면 NavFn/Smac2D/Theta*, 방향·회전반경 있으면 Smac Hybrid/Lattice). **Controller는 "주행 품질 vs 계산 비용"으로 고른다**(가벼움·단순=RPP, 똑똑함·부드러움=MPPI, 세밀튜닝=DWB). Planner가 만든 길을 Controller가 따라가니 **둘은 짝을 맞춰** 고른다(예: Smac Hybrid + MPPI = 차량형 고품질 조합).

---

## 참고자료
- Nav2 공식 문서 (Planner / Controller Plugins)
- 관련 노트: [[2026-06-16-nav2-pkg]] · [[2026-06-16-pid-controller]] · [[2026-06-16-amcl]] · [[2026-06-16-tf]]
