---
title: ros2-namespace
date: 2026-06-15
project: ROS2
tags:
  - 네임스페이스
  - 다중로봇
  - Launch
  - Nav2
  - TF
---

# ROS2 네임스페이스 — 다중로봇 정리

## 1. 정의

**네임스페이스(namespace)** = 노드·토픽·서비스·액션 이름 앞에 붙는 **경로 접두사**. 파일 시스템의 폴더처럼 이름을 묶어 **충돌을 방지**한다.

```
robot1 네임스페이스 →  노드 /robot1/controller
                      토픽 cmd_vel → /robot1/cmd_vel
```

이름 해석 규칙:

| 종류 | 표기 | 결과 (NS=robot1) |
|------|------|------------------|
| 상대(relative) | `cmd_vel` | `/robot1/cmd_vel` ✅ 네임스페이스 적용 |
| 절대(absolute) | `/tf` | `/tf` ❌ 그대로 (NS 무시) |
| private | `~/param` | `/robot1/노드명/param` |

> 한 줄: **상대 이름만 자동으로 갈린다. 절대 이름(`/tf` 등)은 안 갈린다.**

---

## 2. 구현 방안 — 공통 vs 분리

### 🔵 공통 (전 로봇이 1개 공유 / root namespace)

| 자원 | 이유 |
|------|------|
| **시뮬레이터 서버** (Gazebo) | 물리 월드는 하나 |
| **맵 서버 (map_server)** | 보통 모두 같은 지도 공유 |
| **`map` 프레임** | 모든 로봇의 공통 최상위 좌표계 (← `frame_prefix` 안 붙이는 유일한 프레임) |
| **RViz / RMF 관제** | 전체를 한눈에 보는 도구 |

### 🟢 분리 (로봇마다 별도 네임스페이스)

| 자원 | 분리 방법 |
|------|-----------|
| 노드·상대 토픽 | `PushRosNamespace` (자동) |
| `/tf`·`/tf_static` | 상대경로 remap (수동) |
| 프레임 ID (`base_link`,`odom`) | `frame_prefix` (수동) |
| 파라미터 속 프레임 | `RewrittenYaml` 치환 (수동) |
| spawn 엔티티 이름·초기 위치 | 로봇마다 유니크 인자 |

### 한눈 요약 — "4종 세트"

> **분리 = `PushRosNamespace` + `/tf` remap + `frame_prefix` + `RewrittenYaml`**
> (namespace 한 줄만으론 절대 안 됨)

### TF 트리 결과

```
map ─┬─ robot1/odom ─ robot1/base_link ─ robot1/lidar
     └─ robot2/odom ─ robot2/base_link ─ robot2/lidar
```

---

## 3. 구체적 코드 구현

### (a) 핵심 빌딩블록 — 로봇 1대를 "봉투"로 감싸기

```python
from launch.actions import GroupAction
from launch_ros.actions import Node, PushRosNamespace
from launch.actions import IncludeLaunchDescription
from nav2_common.launch import RewrittenYaml

def robot_group(name, x, y, nav2_launch, params_file):
    ns = name
    tf_remap = [('/tf', 'tf'), ('/tf_static', 'tf_static')]   # ② TF 분리

    # ③ 파라미터 속 프레임 치환
    params = RewrittenYaml(
        source_file=params_file,
        root_key=ns,
        param_rewrites={
            'robot_base_frame': f'{ns}/base_link',
            'odom_frame':       f'{ns}/odom',
            'global_frame':     'map',           # map은 공유 → 접두사 X
        },
        convert_types=True,
    )

    return GroupAction([
        PushRosNamespace(ns),                    # ① 그룹 전체 /ns/ 상속

        # robot_state_publisher — 프레임 접두사 + tf remap
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            parameters=[{'frame_prefix': f'{ns}/'}],   # ③ 프레임 ID 분리
            remappings=tf_remap,
        ),

        # 시뮬에 스폰 — 유니크 이름 + 초기 위치
        Node(
            package='ros_gz_sim', executable='create',
            arguments=['-name', ns, '-x', str(x), '-y', str(y), '-topic', 'robot_description'],
        ),

        # nav2 풀스택 include — namespace + 치환된 params 전달
        IncludeLaunchDescription(
            nav2_launch,
            launch_arguments={
                'namespace':    ns,
                'use_namespace':'true',
                'params_file':  params,
                'use_sim_time': 'true',
            }.items(),
        ),
    ])
```

### (b) bringup.py — 공통 1번 + 로봇 N개 루프

```python
from launch import LaunchDescription

def generate_launch_description():
    robots = [
        {'name': 'robot1', 'x': 0.0, 'y': 0.0},
        {'name': 'robot2', 'x': 2.0, 'y': 0.0},
    ]

    ld = []
    # 🔵 공통 자원 (root namespace, 1번만)
    ld.append(gazebo_server_launch())     # 시뮬레이터
    ld.append(map_server_node())          # 공유 맵

    # 🟢 로봇별 그룹 (루프로 N개)
    for r in robots:
        ld.append(robot_group(
            r['name'], r['x'], r['y'],
            nav2_launch=nav2_bringup_launch,
            params_file='nav2_params.yaml',
        ))

    return LaunchDescription(ld)
```

### (c) 실행 후 확인

```bash
ros2 node list      # /robot1/controller_server, /robot2/controller_server
ros2 topic list     # /robot1/cmd_vel, /robot2/cmd_vel
ros2 run tf2_tools view_frames   # map 아래 robot1/*, robot2/* 두 갈래
```

---

## 4. 흔한 함정 체크리스트

- [ ] `/tf` remap 빠뜨림 → 두 로봇 TF가 `/tf`에서 충돌 (가장 흔한 실수)
- [ ] `frame_prefix`만 하고 params 프레임 치환 안 함 → nav2가 `base_link` 못 찾음
- [ ] `map` 프레임에 접두사 붙임 → 로봇 간 좌표 공유 깨짐
- [ ] spawn 엔티티 이름 중복 → 두 번째 로봇 스폰 실패

---

## 5. 대안: 네임스페이스 대신 DDS 도메인 분리

완전히 독립된 로봇(서로 통신 불필요)이면 네임스페이스 대신 `ROS_DOMAIN_ID`를 다르게 줘서 네트워크 레벨에서 통째로 격리할 수도 있다.

```bash
ROS_DOMAIN_ID=1 ros2 launch robot bringup.py   # robot1
ROS_DOMAIN_ID=2 ros2 launch robot bringup.py   # robot2
```

단 이러면 한 관제(RMF 등)에서 여러 로봇을 동시에 못 본다 → 협동·관제가 필요하면 네임스페이스 방식이 맞다.
