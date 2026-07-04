---
title: VNC Viewer 설치 — 원격 GUI 접속 도구
date: 2026-06-16
project: 개발환경
tags:
  - 개발환경
  - VNC
  - RealVNC
  - 원격접속
  - 개발환경
---

# VNC Viewer 설치 — 원격 GUI 접속 도구

> 그저 **GUI를 보고 싶을 때**는 원격 접속을 위한 도구가 필요하다.
> 하지만 **초기 설정 등 꼭 필요한 경우에만** 사용하고, 평소엔 **터미널과 VSCode로 SSH 접속해서 개발!**

---

## Part 0. 언제 쓰나 — VNC vs SSH

| 상황 | 도구 | 이유 |
|------|------|------|
| 데스크톱 화면·창을 **눈으로 봐야 할 때** (RViz, Gazebo, 초기 네트워크/디스플레이 설정) | **VNC Viewer** | 원격지의 GUI 화면을 그대로 미러링 |
| **평소 개발** (코드 편집·빌드·실행·로그 확인) | **터미널 + VSCode (SSH)** | 가볍고 빠름, 텍스트 기반이라 네트워크 부담↓ |

> 핵심: **VNC는 "꼭 GUI가 필요할 때만" 켜는 보조 도구.** 무거우니 상시 사용하지 말고, 일상 개발은 SSH(터미널·VSCode Remote)로 한다.

---

## Part 1. 설치 (RealVNC Viewer 7.13.1)

```bash
# 1. 7.13.1 패키지 다운로드
wget https://downloads.realvnc.com/download/file/viewer.files/VNC-Viewer-7.13.1-Linux-x64.deb

# 2. dpkg를 이용해 설치 진행
sudo dpkg -i VNC-Viewer-7.13.1-Linux-x64.deb
```

> 💡 `dpkg -i` 도중 의존성 오류가 나면 아래로 보충 후 재시도:
> ```bash
> sudo apt-get install -f
> ```

---

## 한 줄 요약

> **VNC Viewer는 원격 GUI를 봐야 할 때만 쓰는 보조 도구**다. `wget`으로 `.deb`를 받아 `sudo dpkg -i`로 설치하고, 초기 설정 같은 꼭 필요한 순간에만 사용한다. **일상 개발은 터미널 + VSCode SSH 접속이 정석.**

---

## 참고자료
- RealVNC 공식 다운로드: downloads.realvnc.com
