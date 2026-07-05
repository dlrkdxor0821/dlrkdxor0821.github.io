---
title: domain_bridge — ROS 2 도메인 브리지
date: 2026-07-05
project: Nav2
group: 스터디
tags:
  - ROS2
  - Nav2
  - domain_bridge
  - ROS_DOMAIN_ID
  - 멀티로봇
  - DDS
---

# domain_bridge — ROS 2 도메인 브리지

서로 다른 `ROS_DOMAIN_ID`로 격리된 ROS 2 네트워크 사이에서 **골라낸 토픽·서비스만 이어주는** 다리. 멀티로봇을 도메인으로 나눠 놓고 필요한 데이터만 공유할 때 쓴다.

---

## 배경 — ROS_DOMAIN_ID 란

ROS 2의 통신(DDS)은 **같은 `ROS_DOMAIN_ID`** 를 가진 노드끼리만 서로 발견(discovery)하고 통신한다. 도메인이 다르면 **아예 안 보인다** — 자연스러운 격리벽. 한 네트워크에 로봇 여러 대를 올리면서 도메인 ID를 다르게 주면:

- **토픽 이름 충돌 방지** — 로봇마다 `/scan`, `/cmd_vel`, `/tf`가 겹쳐도 도메인이 다르면 안 섞인다.
- **디스커버리 트래픽 감소** — 모든 노드가 서로를 발견하려는 부하가 도메인 단위로 쪼개져 가벼워진다.
- **격리 = 안전** — 한 로봇의 문제 토픽이 다른 로봇에 새어 나가지 않는다.

문제는 — 격리해 놓으면 **필요한 것까지 안 보인다.** 함대 관리자가 각 로봇의 목표·상태를 받아야 하거나, 공용 `/map`을 나눠 써야 할 때. 여기서 **domain_bridge**가 등장한다.

---

## 무엇을 하나

**지정한 토픽/서비스만** 골라 A 도메인 → B 도메인으로 복제해 전달한다. 전부 여는 게 아니라 **화이트리스트 방식** — YAML에 적은 것만 건너간다.

![domain_bridge — 도메인 2(로봇 A/Nav2)와 도메인 5(함대 관리자) 사이 선택 토픽 브리지](https://images.prismic.io/asd0821/ljtB16ARMKEvS1aw_domain-bridge-diagram.png?auto=format,compress)

---

## 작동 원리

핵심은 두 가지 — **한 프로세스가 여러 도메인에 동시에 참여**하고, 메시지를 **역직렬화 없이 바이트째로 릴레이**한다.

- **① 여러 도메인에 동시 참여** — 보통 ROS 2 프로세스는 도메인 하나에만 속한다. domain_bridge는 관여하는 도메인마다 **별도 DDS DomainParticipant**를 만들어 **동시에** 붙는다. 그래서 실행 셸의 `ROS_DOMAIN_ID`는 의미가 없다 — 도메인은 config가 정한다.
- **② 토픽마다 sub(from) → pub(to) 릴레이** — 브리지 토픽마다 **from_domain에 구독자**, **to_domain에 발행자**를 생성. from에서 메시지가 들어오면 to로 그대로 다시 발행한다.
- **③ 각 도메인은 독립적으로 discovery** — 브리지가 붙은 각 도메인 안에서 DDS 발견이 따로 돌고, 브리지는 **양쪽의 정식 참가자**로서 자연스럽게 연결된다. 상대 도메인 노드 입장에선 그냥 평범한 pub/sub.
- **④ 서비스 브리지** — from 도메인에 **서비스 서버**, to 도메인에 **클라이언트**를 두고 요청/응답을 왕복 전달한다.

> **왜 모든 타입이 재컴파일 없이 되나** — domain_bridge는 **generic(타입 소거) 구독/발행**을 써서 메시지를 **역직렬화하지 않는다.** from에서 받은 **직렬화된 CDR 버퍼(raw bytes)를 그대로 복사**해 to로 넘길 뿐. YAML의 `type`은 토픽을 올바로 잡기 위한 정보일 뿐, 브리지가 그 타입을 알 필요는 없다. → 어떤 메시지 타입이든 빌드 없이 브리지되고 복사 비용도 작다. 도메인이 물리적으로 떨어져 있으면 **압축(zstd) 모드**로 이 버퍼를 줄여 보낸다.

---

## 구현 방법 — 단계별

```bash
# ① 설치 (배포판에 맞게 humble/iron/jazzy)
sudo apt install ros-humble-domain-bridge
#   또는 소스 빌드:
#   git clone https://github.com/ros2/domain_bridge src/domain_bridge
#   colcon build --packages-select domain_bridge

# ② 노드를 도메인별로 실행
#   로봇 A 터미널 — 도메인 2
export ROS_DOMAIN_ID=2
ros2 launch my_robot nav2.launch.py
#   함대 관리자 터미널 — 도메인 5
export ROS_DOMAIN_ID=5
ros2 launch fleet manager.launch.py

# ④ 브리지 실행 (실행 셸의 ROS_DOMAIN_ID는 상관없음 — config가 도메인 지정)
ros2 run domain_bridge domain_bridge bridge_config.yaml

# ⑤ 검증 — 반대 도메인에서 토픽이 보이는지
ROS_DOMAIN_ID=5 ros2 topic list | grep goal_pose
ROS_DOMAIN_ID=5 ros2 topic echo /goal_pose
ROS_DOMAIN_ID=2 ros2 topic echo /map --once
```

---

## 주요 코드

domain_bridge는 별도 노드 코드를 짜기보다 **YAML 설정**이 곧 로직이고, **launch**로 띄운다.

**`config/bridge_config.yaml`**

```yaml
name: fleet_bridge

topics:
  # ── 로봇 A(2) → 함대(5) : 상태 보고 (이름은 네임스페이스로 remap) ──
  goal_pose:
    type: geometry_msgs/msg/PoseStamped
    from_domain: 2
    to_domain: 5
    remap: /robot_a/goal_pose

  amcl_pose:
    type: geometry_msgs/msg/PoseWithCovarianceStamped
    from_domain: 2
    to_domain: 5
    remap: /robot_a/amcl_pose

  # ── 함대(5) → 로봇 A(2) : 공용 맵 (latched → QoS 필수) ──
  map:
    type: nav_msgs/msg/OccupancyGrid
    from_domain: 5
    to_domain: 2
    qos:
      durability: transient_local
      reliability: reliable

  # ── 함대(5) → 로봇 A(2) : 속도 명령 ──
  cmd_vel:
    type: geometry_msgs/msg/Twist
    from_domain: 5
    to_domain: 2
    remap: /robot_a/cmd_vel

services:
  # 토픽뿐 아니라 서비스도 브리지
  /robot_a/clear_costmap:
    type: nav2_msgs/srv/ClearEntireCostmap
    from_domain: 2
    to_domain: 5
```

**`launch/domain_bridge.launch.py`**

```python
import os
from launch import LaunchDescription
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory


def generate_launch_description():
    config = os.path.join(
        get_package_share_directory('my_fleet'),
        'config', 'bridge_config.yaml',
    )
    return LaunchDescription([
        Node(
            package='domain_bridge',
            executable='domain_bridge',
            name='fleet_domain_bridge',
            arguments=[config],
            output='screen',
        ),
    ])
```

```bash
ros2 launch my_fleet domain_bridge.launch.py
```

> 타입/토픽/도메인 번호(2·5)와 패키지명(`my_fleet`)은 예시. 실제 값으로 교체해서 사용.

---

## 주요 옵션

| 옵션 | 역할 |
| ---- | ---- |
| `from` / `to_domain` | 어느 도메인에서 어느 도메인으로 넘길지 |
| `qos` | durability·reliability 등 QoS 재정의 (맵·TF엔 필수) |
| `remap` | 건너가면서 토픽 이름 바꾸기 (예: `/robot_a/map`) |
| `bidirectional` | 양방향 브리지 (한 줄로 양쪽 전달) |
| `reversed` | 방향 뒤집기 |
| `services` | 토픽 말고 서비스도 브리지 가능 |

---

## Nav2 / 멀티로봇에서 왜 쓰나

로봇 여러 대를 각자 도메인으로 격리해 **토픽 충돌·디스커버리 부하를 없애** 두고, 함대 관리자와 주고받아야 하는 **goal·nav 상태·공용 map**만 브리지로 연결한다. 전부 한 도메인에 몰아넣는 것보다 **확장성·안정성**이 좋다.

---

## 주의할 점

- **QoS 불일치** — `/map`·`/tf_static`은 **transient_local(latched)** 인데, 브리지 QoS를 안 맞추면 늦게 붙은 쪽이 데이터를 못 받는다. QoS는 명시적으로 맞춰라.
- **/tf 폭주 & 시간** — `/tf` 전체를 브리지하면 트래픽이 크다. 필요한 프레임만, `/clock` 동기화도 신경 써야 함.
- **대역폭** — 이미지·포인트클라우드 같은 대용량은 브리지 비용이 크다. domain_bridge의 **압축(compress) 모드**나 꼭 필요한 토픽만 여는 걸로 대응.
