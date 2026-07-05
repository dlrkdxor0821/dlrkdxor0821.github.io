---
title: 기술조사 - Pinky_pro perception 온디바이스 / 로컬
date: 2026-07-05
project: Arte Project Team
tags:
  - perception
  - YOLOv8
  - 온디바이스
  - NCNN
  - 벤치마크
---

# 기술조사 - Pinky_pro perception 온디바이스 / 로컬

## 모델 학습 설정

- 모델: YOLOv8n (nano)

- epochs: 100, batch: 8

- 데이터: 총 635장 (pinky_pro 354 + person 281)

- 클래스: `pinky_pro`, `person`

- best.pt = **epoch 72**에서 선택됨

![image-20260626-050853.png](https://images.prismic.io/asd0821/qi9QV2ynZ9rscSwA_image-20260626-050853.png?auto=format,compress)

![image-20260626-050903.png](https://images.prismic.io/asd0821/9Ke2C2LDIxelmdij_image-20260626-050903.png?auto=format,compress)

## **실테스트 결과**

| 항목 | 엣지(온디바이스) | AI 서버 |
| --- | --- | --- |
| 추론 위치 | 라즈베리파이 Pi 4 (Cortex-A72) CPU | 로컬 PC (GPU) |
| 모델 | NCNN 경량, imgsz 320, threads=4 | full 모델 (PyTorch) |
| 네트워크 | 없음 | **UDP** 왕복 (정식 전송 프로토콜) |

| 지표 | idle (기준선) | 엣지(온디바이스) | 서버(UDP) |
| --- | --- | --- | --- |
| **FPS** | — | 4.96 | **19.09** |
| **e2e 지연 평균** | — | 182 ms | **21.0 ms** |
| 지연 p95 | — | 274 ms | 23.6 ms |
| 추론 자체 | — | ~182 ms (Pi CPU) | **8.6 ms (GPU)** |
| 추가 비용 | — | 없음 | 네트워크 12.5 ms |
| **Pi CPU 사용률** | 9.5% | **85.3%** | 30.4% |
| **Pi 온도** | 53.1 ℃ | **62.7 ℃** (max 67.6) | 54.3 ℃ |
