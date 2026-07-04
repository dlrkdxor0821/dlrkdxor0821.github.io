---
title: Nav2 BT Navigator 완전 정복 — 그리고 우리는 왜 NavigateToPose를 골랐나
date: 2026-06-16
project: Nav2
tags:
  - Nav2
  - BTNavigator
  - BehaviorTree
  - NavigateToPose
  - NavigateThroughPoses
  - 회고
---

# Nav2 BT Navigator 완전 정복 — 그리고 우리는 왜 NavigateToPose를 골랐나

로봇이 목표를 받고, 스스로 길을 찾고, 막히면 알아서 빠져나온다. 이 **"판단의 두뇌"** 가 Nav2의 **BT Navigator**다.

## 1. BT Navigator는 직접 일하지 않는다

BT Navigator는 경로를 짜지도, 바퀴를 굴리지도 않는다. 대신 **Behavior Tree(행동트리, XML 대본)** 를 읽어 일정 주기로 **tick**하면서, 대본이 시키는 대로 **Planner·Controller·Recovery 서버를 Action으로 호출**한다.

> 회사로 치면 **사장**이다. 직접 물건을 만들지 않고 "무엇을 할지" 결정해 직원(서버)에게 지시한다. 그래서 Nav2의 **작전(명령) 축 최상위**에 있다.

## 2. 왜 하필 Behavior Tree인가? (vs 상태기계)

예전엔 내비게이션 로직을 **FSM(상태기계)** 으로 짰다. 하지만 상태가 늘면 전이가 폭발한다(스파게티). Behavior Tree는:

| 장점 | 의미 |
|---|---|
| **모듈성** | 작은 노드를 조립 — 일부만 떼어 재사용 |
| **반응성** | 매 tick마다 위에서부터 재평가 → 상황 변화에 즉각 반응 |
| **복구가 자연스럽다** | "실패하면 다음 방법" 이 트리 구조에 그대로 표현됨 |
| **XML만 고치면 끝** | 행동 로직 변경에 **재컴파일 불필요** |

## 3. Behavior Tree 읽는 법

각 노드를 위에서부터 **tick**(똑똑 두드림)하면 셋 중 하나를 반환한다 — **SUCCESS · FAILURE · RUNNING**. 이 값이 부모 노드의 흐름을 결정한다.

| 노드 종류 | 예 | 역할 |
|---|---|---|
| **Control(제어)** | `Sequence`, `Fallback`, `PipelineSequence`, `RecoveryNode` | 자식을 어떤 순서/조건으로 |
| **Action(행동·잎)** | `ComputePathToPose`, `FollowPath`, `Spin`, `BackUp` | 실제 서버 호출 |
| **Condition(조건)** | `GoalUpdated`, `IsBatteryLow` | 참/거짓 분기 |
| **Decorator(장식)** | `RateController`, `SpeedController` | 자식 실행을 조절 |

- **Sequence** = 차례로, 하나라도 실패하면 전체 실패 (AND)
- **Fallback** = 차례로, 하나라도 성공하면 전체 성공 ("안 되면 다음 방법", OR)

## 4. 기본 트리 — "재계획 주행 + 복구"

navigate_to_pose의 기본 트리는 대략 이렇다:

```
RecoveryNode (전체를 N번까지 재시도)
├─ [주행] PipelineSequence
│    ├─ RateController → ComputePathToPose   (주기적 경로 재계획 = Planner 호출)
│    └─ FollowPath                            (경로 추종 = Controller 호출)
│
└─ [복구] Fallback                            (주행 실패 시)
     ├─ ClearCostmaps → Spin → Wait → BackUp
```

읽는 법: **"경로 계획+추종을 계속 시도하다, 막히면 복구 행동을 차례로, 그래도 안 되면 통째로 N번 재시도."**

## 5. navigator 두 종류

BT Navigator가 기본 제공하는 진입점(navigator)은 둘:

| | **NavigateToPose** | **NavigateThroughPoses** |
|---|---|---|
| 목표 | 단일 pose | 여러 pose 경유 |
| 중간점 | — | **안 멈추고 통과(논스톱)** |
| 경로 | A→B 한 번 | 전체를 **하나의 연속 경로**로 |

> (점마다 **멈춰서 작업**하는 건 이 둘이 아니라 **Waypoint Follower(`FollowWaypoints`)** 다.)

## 6. 주요 파라미터

```yaml
bt_navigator:
  ros__parameters:
    global_frame: map
    robot_base_frame: base_link
    bt_loop_duration: 10                       # BT tick 주기(ms)
    default_nav_to_pose_bt_xml: "..."          # 트리 XML 교체 지점
    navigators: ["navigate_to_pose", "navigate_through_poses"]
```

행동을 바꾸고 싶으면 코드가 아니라 **XML을 갈아끼운다.**

---

# 🔍 회고: 우리 프로젝트는 왜 NavigateToPose로 "바꿨나"

우리 로봇(GogoPing)은 `graph_router`가 **Dijkstra로 waypoint 시퀀스**를 뽑아 경유 주행을 한다. **여러 점을 거쳐 가는** 게 핵심이다.

그렇다면 교과서적 정답은 분명 **NavigateThroughPoses** 다 — "여러 점 논스톱 경유"가 정확히 그 용도니까. 그런데 우리는 일부러 그걸 두고, **구간마다 NavigateToPose를 chain 호출**하는 쪽으로 갔다. **왜 그 정석을 벗어났나?** — 이유는 하나로 모인다:

> **구간과 구간 "사이"에 우리만의 제어 훅(hook)을 끼워 넣어야 했기 때문이다.**

ThroughPoses는 모든 점을 받아 **하나의 연속 경로로 통째 계획**한다. 매끄럽지만, **중간에 끼어들 틈이 없다.** 반면 우리 graph_router는 한 정점에 도착할 때마다(=한 NavigateToPose가 끝날 때마다) 다음을 해야 했다:

| 구간 경계에서 한 일 | 코드 근거 |
|---|---|
| **① `can_rotate` 정점에서 제자리 회전** | `_do_rotate_in_place` (좁은 코너 자세 정렬) |
| **② 사람 감지 시 재라우팅** | `/gogoping/proximity_event` 구독 → 막힌 정점 빼고 **Dijkstra 재실행** |
| **③ 다음 목표 preempt → 안 멈추고 부드럽게** | `preempt_distance=0.5` (도착 직전 다음 구간 미리 발사) |

핵심은 **③** 이다 — preempt 덕분에 **구간별 ToPose를 쓰면서도 ThroughPoses 같은 논스톱 매끄러움**을 얻는다. 즉 우리는:

- **ThroughPoses의 장점(논스톱 주행)** 은 preempt로 흉내 내고,
- **ThroughPoses가 못 주는 것(구간 경계의 재라우팅·회전 제어권)** 은 ToPose로 챙겼다.

거기에 커스텀 BT(`navigate_to_pose_3hz_replan.xml`)로 **재계획을 3Hz로 올려** 구간 이음새까지 매끄럽게 보강했다.

## 그래서, 좋은 판단이었나? → **그렇다.**

| 우리가 필요했던 것 | ThroughPoses | NavigateToPose(구간별) |
|---|---|---|
| 논스톱 매끄러운 주행 | ✅ 기본 | ✅ preempt로 확보 |
| **사람 만나면 동적 재라우팅** | ❌ 끼어들 틈 없음 | ✅ 구간마다 Dijkstra 재실행 |
| **정점별 제자리 회전** | ❌ 어려움 | ✅ 구간 경계에서 주입 |
| 비용 | 단순·가벼움 | 구간마다 재계획 약간의 overhead |

> **결론:** "경유 주행 = ThroughPoses"라는 정석을 벗어난 이유가 분명하다. 우리에겐 **정적인 매끈함보다 동적인 반응성(재라우팅·회전·preempt)이 더 중요**했고, 그건 **구간 경계에 제어 훅을 둘 수 있는 NavigateToPose 구조라야** 가능했다.
>
> **만약 정해진 코스를 그냥 논스톱으로 통과만 하면 됐다면** ThroughPoses가 더 단순하고 매끄러웠을 것이다. 우리는 그 경우가 아니었다 — 그래서 바꿨다.

---

## 한 줄 요약

> **BT Navigator = Behavior Tree(XML 대본)를 tick하며 Planner·Controller·Recovery를 호출하는 오케스트레이터.** navigator는 `NavigateToPose`(단일)·`NavigateThroughPoses`(논스톱 경유) 둘이 기본. 우리 프로젝트는 경유 주행임에도 ThroughPoses 대신 **구간별 NavigateToPose**를 택했는데, 그 이유는 **구간 경계에 재라우팅·제자리회전·preempt 같은 반응형 제어 훅을 끼워야 했기 때문**이다.

---

## 참고자료
- Nav2 공식 문서 (BT Navigator / Behavior Tree XML / Navigators)
