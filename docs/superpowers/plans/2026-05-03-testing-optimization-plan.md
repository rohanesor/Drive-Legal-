# DriveLegal: Testing & Optimization Plan (8.5 Weeks)

**Period:** May 3 - June 30, 2026 (Hackathon Deadline: June 30)  
**Target:** Pilot-ready, 90%+ accuracy, fully tested before deployment

---

## Executive Summary

| Phase | Timeline | Deliverable | Status |
|-------|----------|-------------|--------|
| **Phase 1: API Integration** | May 3-17 (2 weeks) | Real APIs connected, 100+ test records | Ready |
| **Phase 2: Alpha Testing** | May 18-31 (2 weeks) | Internal testing, accuracy benchmarks | Ready |
| **Phase 3: Pilot Recruitment** | June 1-7 (1 week) | 50 pilot users onboarded | Ready |
| **Phase 4: Pilot Testing** | June 8-22 (2 weeks) | User feedback, accuracy validation, bug fixes | Ready |
| **Phase 5: Performance Optimization** | June 23-27 (1 week) | Android 8 optimization, speed tuning | Ready |
| **Phase 6: Final QA & Refinement** | June 28-29 (2 days) | Final bug fixes, UI polish | Ready |
| **Hackathon Ready** | June 30 | ✅ Submission | Ready |

---

## Phase 1: API Integration (May 3-17)

### 1.1 Goals
- [ ] Connect real data.gov.in Traffic Laws API
- [ ] Integrate OpenStreetMap Incidents API
- [ ] Integrate state PWD Road Conditions feeds
- [ ] 100+ test records per data source
- [ ] Error handling & fallback validation

### 1.2 Deliverables

#### Task 1a: data.gov.in Traffic Laws API
```python
# sync_service.py - Implement real API call
_fetch_from_datagov_laws(state):
    # Current: returns empty (mock data fills in)
    # Todo: Call actual API endpoint
    # API: https://api.data.gov.in/resource/... 
    # Params: state, category=traffic_law
    # Response: JSON array of amendments
    
# Test:
# - Fetch for all 6 states
# - Parse amendments correctly
# - Validate multilingual content
# - Confirm TTL logic works
# - Test fallback if API fails
```

**Acceptance Criteria:**
- ✅ 50+ amendments fetched across 6 states
- ✅ All amendments have effective_date
- ✅ Multilingual fields populated (EN/TA/HI)
- ✅ API responds <15s consistently
- ✅ Fallback to mock if API fails

#### Task 1b: OpenStreetMap Incidents API
```python
# sync_service.py - Implement OSM incidents
_fetch_from_osm_incidents(state):
    # Current: returns empty
    # Todo: Query OSM API for recent changeset comments/notes
    # Alternative: Use traffic data from OSM tags
    # Fallback: State traffic authority RSS feeds
    
# Test:
# - Fetch incidents for major cities in each state
# - Validate lat/lng accuracy
# - Confirm severity classification
# - TTL handling (incidents expire after 2-6 hours)
# - Mock data used if no real incidents
```

**Acceptance Criteria:**
- ✅ 10+ incidents per state detected
- ✅ Incident types: accident, congestion, hazard
- ✅ Severity levels: critical, high, medium, low
- ✅ Lat/lng within state bounds
- ✅ Response <10s

#### Task 1c: State PWD Road Conditions
```python
# sync_service.py - Implement PWD integration
_fetch_from_pwd_conditions(state):
    # Current: returns empty
    # Todo: Scrape or API from state-specific PWD portals
    # States: TN, KN, AP, KL, MH, DL
    # Fallback: OSM pothole/construction tags + mock data
    
# Test:
# - Fetch for all 6 states
# - Identify potholes, construction, closures
# - Validate severity assessment
# - TTL logic (conditions last days-weeks)
```

**Acceptance Criteria:**
- ✅ 5-15 conditions per state detected
- ✅ Condition types: pothole, construction, closure, flooding
- ✅ All have estimated_duration
- ✅ API response <12s or fallback to mock

### 1.3 Testing

```bash
# Unit tests for each API fetcher
pytest python-service/tests/test_api_integration.py::test_datagov_laws
pytest python-service/tests/test_api_integration.py::test_osm_incidents
pytest python-service/tests/test_api_integration.py::test_pwd_conditions

# Integration test (end-to-end sync)
python python-service/sync_service.py --test-mode
# Expected output: 100+ records across 3 sources

# Performance test
time python python-service/sync_service.py
# Target: <15s typical, <60s worst-case

# Fallback test
python python-service/sync_service.py --simulate-api-failure
# Expected: Uses seed data, logs errors, doesn't crash
```

### 1.4 Deliverable Checklist
- [ ] All 3 APIs implemented in sync_service.py
- [ ] 100+ test records per source in database
- [ ] Unit tests passing (100% coverage)
- [ ] Integration tests passing
- [ ] Performance benchmarks met (<60s)
- [ ] Fallback tested & working
- [ ] Commit: "feat: integrate real APIs (data.gov.in, OSM, PWD)"

---

## Phase 2: Alpha Testing (May 18-31)

### 2.1 Goals
- [ ] Benchmark accuracy on 100+ legal questions
- [ ] Test all voice interactions (EN/TA/HI)
- [ ] Validate Android 8+ compatibility
- [ ] Fix critical bugs
- [ ] Establish baseline metrics

### 2.2 Alpha Test Plan

#### Test 1: Accuracy Benchmarking

**Methodology:**
Create test suite of 100 legal questions covering:
- Speeding violations (state-specific fines)
- Helmet/seatbelt violations
- Traffic signal violations
- License-related issues
- Procedure questions (appeals, licenses)

```json
{
  "test_cases": [
    {
      "id": "q1_speeding_tn",
      "question": "What's the fine for speeding 30 km/h over limit in Tamil Nadu?",
      "expected_answers": [
        "First offense: ₹500",
        "Second offense: ₹1000"
      ],
      "language": "en",
      "state": "TN",
      "category": "fine"
    },
    {
      "id": "q2_speeding_kn_hi",
      "question": "कर्नाटक में गति सीमा से अधिक चलाने पर जुर्माना क्या है?",
      "expected_answers": [
        "पहला अपराध: ₹500",
        "दूसरा अपराध: ₹1000"
      ],
      "language": "hi",
      "state": "KN",
      "category": "fine"
    }
  ]
}
```

**Test Execution:**
```bash
# Run accuracy benchmark
python python-service/tests/benchmark_accuracy.py \
  --test-cases tests/test_cases_100q.json \
  --output results/accuracy_report.json

# Expected output:
# {
#   "total_questions": 100,
#   "correct_answers": 92,
#   "accuracy": 0.92,
#   "by_category": {
#     "fine": 0.95,
#     "procedure": 0.88,
#     "violation": 0.91
#   },
#   "by_language": {
#     "en": 0.94,
#     "ta": 0.89,
#     "hi": 0.90
#   }
# }
```

**Success Criteria:**
- ✅ Overall accuracy ≥ 90%
- ✅ All languages ≥ 85%
- ✅ All categories ≥ 85%

#### Test 2: Voice Interaction Testing

**Test scenarios:**
```
Scenario 1: Voice input (Tamil)
- User: "ஹெல்மெட் இல்லாமல் பைக் ஓட்டினால் என்ன தண்டணை?"
- Expected: LLM responds in Tamil with fine amount + amendments
- Test: STT accuracy, TTS quality, response relevance

Scenario 2: Multilingual context switching
- User: "Tell me about speed limits" (English)
- User: "இப்போது சாலை நிலை எப்படி உள்ளது?" (Tamil - road conditions)
- Expected: Smooth language switch, real-time alerts in Tamil

Scenario 3: Edge case - unclear audio
- User: [poor quality audio, background noise]
- Expected: Graceful fallback - "Could not understand. Please type or try again."
```

**Test Tools:**
```bash
# STT accuracy test
python python-service/tests/test_stt_accuracy.py \
  --language ta \
  --test-audio tests/audio_samples_ta/ \
  --threshold 0.85

# TTS quality test (manual + automated)
python python-service/tests/test_tts_quality.py \
  --language hi \
  --output tests/tts_samples/

# End-to-end voice pipeline
python python-service/tests/test_voice_pipeline.py \
  --scenarios tests/voice_scenarios.json
```

#### Test 3: Android 8+ Compatibility

**Devices to test:**
- [ ] Android 8 (emulator or real device)
- [ ] Android 10 (if available)
- [ ] Android 12 (if available)

**Test checklist:**
```
Core Functionality:
- [ ] App launches without crashes
- [ ] Database initializes
- [ ] Models load (TinyLlama, FAISS, Whisper)
- [ ] Sync completes in <60s
- [ ] Chat responds correctly
- [ ] Voice input/output works

Performance:
- [ ] App responsive (no 5s+ freezes)
- [ ] Memory usage <150MB peak
- [ ] Startup time <10s
- [ ] Battery drain acceptable (not >15%/hour)

Offline:
- [ ] Works without internet
- [ ] Sync gracefully fails & falls back
- [ ] Chat continues offline

Permissions:
- [ ] GPS permission handling correct
- [ ] Microphone permission handling correct
- [ ] Storage permission handling correct
```

**Test automation:**
```bash
# Android instrumentation tests
cd frontend/android
./gradlew connectedAndroidTest

# Performance monitoring
adb shell dumpsys meminfo com.drivelegal
adb shell batterystats --enable full-wake-history

# Logcat for errors
adb logcat | grep -i "drivelegal\|error\|crash"
```

### 2.3 Bug Prioritization

| Priority | Type | Example | Max Age |
|----------|------|---------|---------|
| P0 (Critical) | Crash | App force closes, can't sync | Fix same day |
| P1 (High) | Accuracy <85% | Wrong fines returned | Fix within 2 days |
| P2 (Medium) | UI/UX | Button unresponsive, typo | Fix within 1 week |
| P3 (Low) | Enhancement | Layout could be cleaner | Fix before pilot if time |

### 2.4 Deliverable Checklist
- [ ] 100 test questions created & tested
- [ ] Accuracy report: ≥90% (target met)
- [ ] Voice testing completed (all 3 languages)
- [ ] Android 8+ compatibility verified
- [ ] All P0 & P1 bugs fixed
- [ ] Metrics baseline established
- [ ] Bug report compiled
- [ ] Commit: "test: alpha release - 90% accuracy verified"

---

## Phase 3: Pilot Recruitment (June 1-7)

### 3.1 Recruitment Strategy

**Target Profile:**
- Location: Tamil Nadu, Karnataka (6 states ideally)
- Demographics: Active drivers, use smartphones
- Tech comfort: Can install APK, provide feedback
- Commitment: Use app for 2 weeks, answer surveys

**Recruitment Channels:**
1. **Driving schools** — Partner with local driving instructors
2. **Community groups** — Facebook/WhatsApp groups for drivers
3. **Universities** — Student parking lots, transportation offices
4. **Ride-sharing networks** — Uber/Ola driver groups
5. **Traffic safety organizations** — NGOs focused on road safety

**Recruitment Tool:**
```
Landing page: drivelegal.in/pilot
- 1-min video demo
- Feature highlights
- Privacy commitment
- Sign-up form (name, phone, state, language preference)
- APK download link

Form:
- Name, Age, State
- Primary language preference (EN/TA/HI)
- How often they drive (daily/weekly/monthly)
- Android version they have
- Consent for anonymized feedback
```

**Target: 50 users**
- Week 1 (June 1-3): 20 users
- Week 1 (June 4-7): 30 users

**Onboarding Process:**
1. Send APK via email/WhatsApp
2. Support call (troubleshoot installation)
3. 5-minute tutorial (walkthrough)
4. Daily sync of usage data (anonymized)
5. Weekly check-in via WhatsApp

### 3.2 Deliverable Checklist
- [ ] Landing page created
- [ ] 50 pilot users recruited
- [ ] Onboarding completed
- [ ] Daily usage telemetry enabled
- [ ] Feedback collection system ready
- [ ] Commit: "docs: pilot recruitment complete (50 users)"

---

## Phase 4: Pilot Testing (June 8-22)

### 4.1 Testing During Pilot

**Metrics Tracked:**
```json
{
  "daily_metrics": {
    "active_users": 0,
    "queries_per_user": 0,
    "voice_interactions_pct": 0,
    "language_distribution": {"en": 0, "ta": 0, "hi": 0},
    "avg_response_time_ms": 0,
    "crashes": 0,
    "sync_success_rate": 0
  },
  "accuracy_metrics": {
    "helpful_responses_pct": 0,
    "accuracy_self_rating": 0,
    "bug_reports": 0,
    "feature_requests": 0
  }
}
```

**Success Criteria:**
- ✅ ≥40 of 50 users actively using (80% retention)
- ✅ ≥2 queries/user/day average
- ✅ ≥80% find responses helpful
- ✅ ≥90% accuracy on self-rating
- ✅ <2 crashes per user during 2 weeks
- ✅ Sync success rate ≥99%

**Feedback Channels:**
1. **In-app rating** — After each response (1-5 stars + comment)
2. **Weekly survey** — Google Form sent via WhatsApp
3. **WhatsApp support group** — Direct support & issue reporting
4. **Usage analytics** — Automatic tracking (no PII)

**Weekly Feedback Template:**
```
DriveLegal Pilot - Week 1 Feedback

1. How helpful has DriveLegal been? (1-5)
2. Which feature do you use most? 
   [ ] Chat [ ] Voice [ ] Law amendments [ ] Real-time alerts
3. Any crashes or issues?
4. What would make it better?
5. Would you recommend to a friend?
```

### 4.2 Real-Time Issue Response

**Support SLA:**
| Severity | Response | Resolution |
|----------|----------|-----------|
| App crash | <1 hour | <24 hours |
| Wrong answer | <4 hours | <48 hours |
| Feature request | <24 hours | Within pilot if critical |

**Issue Tracking:**
```bash
# Create GitHub issues for pilot feedback
gh issue create \
  --title "Pilot: Wrong speed fine for Tamil Nadu" \
  --label "pilot-feedback,accuracy" \
  --assignee @me \
  --body "User reported fine ₹300 instead of ₹500 for 30 km/h over"
```

### 4.3 Mid-Pilot Check (June 15)

**Go/No-Go Decision Point:**
- If ≥80% retention & ≥90% accuracy → Continue to Phase 5
- If <80% retention or <85% accuracy → Extended pilot + bug fixes

### 4.4 Deliverable Checklist
- [ ] 50 pilot users using app actively (2 weeks)
- [ ] Metrics dashboard operational
- [ ] ≥80% retention rate
- [ ] Accuracy ≥90% (validated by pilot feedback)
- [ ] <5 critical bugs, all fixed
- [ ] Pilot report compiled
- [ ] Commit: "test: pilot phase complete - 90% accuracy confirmed"

---

## Phase 5: Performance Optimization (June 23-27)

### 5.1 Android 8 Device Optimization

**Target Metrics:**
- Startup time: <8 seconds
- Memory: <120MB peak
- Battery: <10%/hour in active use
- No crashes on older devices

**Optimization Tasks:**

#### Task 1: Model Loading Optimization
```python
# Current: Models load on first query (lazy loading)
# Issue: First response slow on Android 8
# Solution: Parallel preload during sync, show progress

# In sync_service.py or background service
def preload_models_in_background():
    """Preload FAISS, TinyLlama while sync runs"""
    with ThreadPoolExecutor(max_workers=2) as executor:
        executor.submit(load_faiss_index)
        executor.submit(load_llm_model)
    # Models cached in memory for fast query response
```

**Expected improvement:** First response: 8s → 2s

#### Task 2: Memory Optimization
```python
# Profile memory usage
python -m memory_profiler python-service/main.py

# Potential optimizations:
# 1. Cache embeddings instead of recomputing
# 2. Batch queries instead of processing individually
# 3. Model quantization (already using Q4 for TinyLlama)
# 4. Garbage collection tuning
```

#### Task 3: Battery Optimization
```python
# Android battery profiling
# 1. Disable continuous GPS polling during sync (do it once/launch)
# 2. Batch network requests
# 3. Use efficient JSON parsing
# 4. Limit background service wakeups

# In backgroundService.ts
// Current: GPS polling every 30s
// Optimized: Sync on launch + user request only (saves 80% battery)
```

#### Task 4: UI Responsiveness
```
# React Native optimization
- [ ] Memoize components (prevent re-renders)
- [ ] Virtualize long lists
- [ ] Defer expensive computations to worker thread
- [ ] Profile with React DevTools
```

### 5.2 Performance Testing

```bash
# Startup time profiling
time python -m cProfile -s cumtime python-service/main.py

# Memory profiling
python -m memory_profiler python-service/main.py

# Battery drain test (6-hour continuous use)
adb shell dumpsys batterystats > before.txt
[Run app for 6 hours]
adb shell dumpsys batterystats > after.txt
# Expected: <60% battery drain

# Load test (100 concurrent queries)
locust -f tests/load_test.py --headless -u 100 -r 10
```

### 5.3 Deliverable Checklist
- [ ] Startup time <8s verified
- [ ] Memory <120MB on Android 8
- [ ] Battery <10%/hour in active use
- [ ] No crashes on older devices
- [ ] Performance report compiled
- [ ] Commit: "perf: Android 8 optimization (startup 8s, mem 120MB)"

---

## Phase 6: Final QA & Refinement (June 28-29)

### 6.1 Final Checklist

**Core Functionality:**
- [ ] All features working (chat, voice, sync, offline)
- [ ] No P0 or P1 bugs
- [ ] Accuracy ≥90% confirmed by pilot + alpha

**Compliance & Security:**
- [ ] Privacy policy updated (for pilot data usage)
- [ ] Permissions documented
- [ ] Data deletion tested

**Documentation:**
- [ ] README updated with setup instructions
- [ ] User guide (quick start)
- [ ] API integration guide (for real APIs)
- [ ] Testing report (alpha + pilot results)

**Build & Release:**
- [ ] APK size <200MB
- [ ] Release build tested on Android 8-12
- [ ] Signed APK ready for submission

### 6.2 UI Polish

**From pilot feedback:**
- [ ] Fix any UX complaints
- [ ] Improve unclear text
- [ ] Enhance multilingual display
- [ ] Polish animations/transitions

### 6.3 Deliverable Checklist
- [ ] Final QA passed
- [ ] All issues resolved
- [ ] Documentation complete
- [ ] Release APK built & tested
- [ ] Commit: "release: hackathon submission ready"

---

## Timeline Summary

```
May 3     |-------- Phase 1 --------|
          | API Integration (2 wks)|

May 18    |-------- Phase 2 --------|
          | Alpha Testing (2 wks)  |

June 1    |--- P3 ---|
          |Recruitment|

June 8    |------------ Phase 4 ---------|
          |   Pilot Testing (2 wks)     |

June 23   |-- P5 --|
          |Optim.  |

June 28   |-- P6 --|
          | Final  |

June 30   🎯 HACKATHON READY
```

---

## Success Metrics (Final)

| Metric | Target | Status |
|--------|--------|--------|
| Accuracy | ≥90% | Benchmark in Phase 2, validate in Phase 4 |
| Pilot users | 50 | Recruit in Phase 3 |
| Retention | ≥80% | Monitor in Phase 4 |
| Startup time | <8s | Optimize in Phase 5 |
| Memory | <120MB | Optimize in Phase 5 |
| Crashes | <1/user/2wks | Target in Phase 4 |
| Voice accuracy | ≥85% | Test in Phase 2 |
| Offline | 100% | Always on |
| Android 8+ | 100% | Test in Phase 2, optimize Phase 5 |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| API unavailable | Medium | High | Use mock data as fallback (✓ built) |
| Accuracy <90% | Low | High | Extended alpha testing, retrain if needed |
| Pilot recruitment slow | Low | Medium | Start early, use multiple channels |
| Android 8 performance | Medium | Medium | Profiling early, optimize incrementally |
| Voice recognition accuracy | Medium | Medium | Benchmark early (Phase 2), use Whisper-tiny |

---

## Testing Deliverables Summary

By June 30, you'll have:
1. ✅ Real APIs integrated & tested
2. ✅ 100+ test cases passing (90%+ accuracy)
3. ✅ 50 pilot users validated (80%+ retention)
4. ✅ All target metrics met
5. ✅ Comprehensive testing report
6. ✅ Hackathon-ready APK

**No deployment — only testing & submission.**
