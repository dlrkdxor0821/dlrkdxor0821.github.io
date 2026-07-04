---
title: database-basics
date: 2026-06-15
project: Database
tags:
  - 데이터베이스
  - PostgreSQL
  - SQL
  - NoSQL
  - ORM
---

# 데이터베이스(DB) 완전 정리

## 1. DB 종류 — 데이터를 어떻게 담느냐

### 🅰 관계형 DB (SQL) — 표(엑셀)처럼 저장

| DB | 한마디 | 언제 주로 쓰나 | 확장성 |
|----|--------|----------------|--------|
| **PostgreSQL** | 강력·기능 많음 (1위급) | 거의 모든 일반 프로젝트, 복잡 데이터·AI | ⭐⭐⭐ Extension — pgvector·PostGIS·TimescaleDB |
| **MySQL** | 가볍고 빠름 | 일반 웹사이트, 워드프레스, 기존 호환 | ⭐ 플러그인·스토리지 엔진 (제한적) |
| **MariaDB** | MySQL 무료판 | MySQL 쓰되 라이선스 자유 원할 때 | ⭐ 플러그인 (MySQL보다 다양) |
| **SQLite** | 파일 하나로 끝 | 모바일 앱, 소형, 프로토타입, 1인 사용 | ⭐⭐ Loadable Extension — FTS5·sqlite-vec |

### 🅱 NoSQL — 표가 아닌 자유로운 방식

| DB | 한마디 | 언제 주로 쓰나 | 확장성 |
|----|--------|----------------|--------|
| **MongoDB** | 문서(JSON) 저장, 유연 | 구조 자주 바뀜, 빠른 개발, 로그·콘텐츠 | 내장 + Atlas (Vector Search) |
| **Redis** | 메모리 초고속 | 캐시·세션, 실시간 순위/카운터, 큐 | ⭐⭐ Module — RediSearch·RedisJSON |
| **Cassandra / DynamoDB** | 초대용량 분산 | 엄청난 트래픽·데이터, 대규모 서비스 | 제한적 / 관리형 |

> 📌 보통: 관계형(SQL) 1개를 메인 + 필요하면 Redis(캐시) 곁들임

---

## 2. 확장성(Extension) — "기능을 끼워 넣기"

DB 본체는 그대로 두고, 필요한 기능만 켜서 추가하는 것. PostgreSQL이 가장 풍부하다.

### PostgreSQL 대표 확장

| 확장 | 기능 |
|------|------|
| **pgvector** | 벡터 임베딩·유사도 검색 (AI 의미 검색) |
| **PostGIS** | 지도·좌표·거리 계산 |
| **TimescaleDB** | 시계열(센서·로그·주가) 최적화 |
| **pg_trgm** | 오타 허용 유사 텍스트 검색 |
| **postgres_fdw** | 다른 DB에 연결 |
| **pg_cron** | DB 안에서 예약 작업 |

```sql
CREATE EXTENSION vector;        -- 확장 켜기
SELECT * FROM pg_extension;     -- 켜진 확장 보기
```

### 🔥 요즘 거의 모든 DB가 "벡터 검색" 추가 (AI 붐)

| DB | 벡터 검색 |
|----|-----------|
| PostgreSQL | pgvector |
| Redis | RediSearch |
| SQLite | sqlite-vec |
| MongoDB | Atlas Vector Search |
| 전문 벡터DB | Pinecone·Milvus·Qdrant·Weaviate |

> PostgreSQL의 강점: 확장만 켜면 한 DB 안에서 AI 검색 + 지도 + 시계열까지 다 됨.

---

## 3. 접근 방식 — 코드가 DB에 어떻게 말 거느냐

### 축 ① SQL 직접 쓰기 vs ORM (통역사)

| 방식 | 한마디 | 언제 주로 쓰나 |
|------|--------|----------------|
| **생 SQL** | SQL 직접 작성 | 복잡 통계·집계, 성능 극한 튜닝, 단순 스크립트 |
| **ORM** | 파이썬 코드→SQL 자동번역 | 모델 많은 일반 앱, 팀 협업·장기 유지보수, 반복 CRUD |

- **생 SQL**: `cursor.execute("SELECT * FROM books WHERE id = 1")` → 정확·빠름, SQL 다 써야 함
- **ORM**: `session.query(Book).filter(Book.id == 1)` → 깔끔·편함, 중간 번역 계층
- 비유: 생 SQL = 현지어로 직접 대화 / ORM = 통역사 두고 대화

### 축 ② 동기 vs 비동기 (기다리는 방식)

| 방식 | 한마디 | 언제 주로 쓰나 |
|------|--------|----------------|
| **동기(sync)** | 답 올 때까지 줄 서서 대기 | 단순한 앱, 순차 처리, 배치·스크립트 |
| **비동기(async)** | 기다리는 동안 다른 일 처리 | 동시 요청 많은 웹서버/API, 실시간 |

---

## 4. 프로젝트 비교 (pingdergarten / shoppinkki)

| 항목 | pingdergarten | shoppinkki |
|------|---------------|------------|
| **DB** | PostgreSQL (관계형) | PostgreSQL (관계형) |
| **확장** | pgvector (AI 벡터 검색) | pgvector (AI 벡터 검색) |
| **SQL 방식** | ORM (SQLAlchemy, 모델 많음·유지보수↑) | 생 SQL (psycopg2, 직접·단순) |
| **기다림** | 비동기 (asyncpg, 동시요청) | 동기 (하나씩 확실히) |

> 둘 다 같은 DB(PostgreSQL + pgvector)지만 접근 방식이 다름 — pingdergarten은 "통역사 + 동시처리", shoppinkki는 "직접 + 하나씩".

---

## 한 줄 요약

> - **DB 종류**: 일반=PostgreSQL, 가벼움=MySQL/SQLite, 유연=MongoDB, 캐시=Redis, 초대용량=Cassandra
> - **확장성**: PostgreSQL=Extension(최강), Redis=Module, SQLite=Loadable, MongoDB=내장/Atlas — 요즘 다들 벡터 검색 지원
> - **접근 방식**: 복잡쿼리/성능=생SQL · 일반앱/유지보수=ORM / 단순=동기 · 동시요청많음=비동기
