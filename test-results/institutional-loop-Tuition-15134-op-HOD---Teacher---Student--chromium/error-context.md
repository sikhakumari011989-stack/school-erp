# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: institutional-loop.spec.js >> Tuition ERP - Multi-Tenant Institutional E2E Lifecycle >> Step 1 to 6: Core Institutional Loop (HOD -> Teacher -> Student)
- Location: tests\e2e\institutional-loop.spec.js:18:3

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Principal Student & Class Control")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - img "School Crest" [ref=e9]
          - generic [ref=e10]:
            - heading "Institutional Campus" [level=2] [ref=e11]
            - paragraph [ref=e14]: OASIS-TUTORIALS
        - button "«" [ref=e15] [cursor=pointer]
      - navigation [ref=e16]:
        - generic [ref=e17]: Executive Suite / Command Center
        - button "📈 Trustee Command" [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: 📈
          - generic [ref=e20]: Trustee Command
        - button "🏛️ Principal Operations" [ref=e21] [cursor=pointer]:
          - generic [ref=e22]: 🏛️
          - generic [ref=e23]: Principal Operations
        - button "📊 School Analytics" [ref=e24] [cursor=pointer]:
          - generic [ref=e25]: 📊
          - generic [ref=e26]: School Analytics
        - button "📑 Executive Reports" [ref=e27] [cursor=pointer]:
          - generic [ref=e28]: 📑
          - generic [ref=e29]: Executive Reports
        - button "🎯 Students & Admissions" [ref=e30] [cursor=pointer]:
          - generic [ref=e31]: 🎯
          - generic [ref=e32]: Students & Admissions
        - button "🏫 Classes & Sections" [ref=e33] [cursor=pointer]:
          - generic [ref=e34]: 🏫
          - generic [ref=e35]: Classes & Sections
        - button "🗓️ Master Timetable" [ref=e36] [cursor=pointer]:
          - generic [ref=e37]: 🗓️
          - generic [ref=e38]: Master Timetable
        - button "💰 Fee Treasury & Dues" [ref=e39] [cursor=pointer]:
          - generic [ref=e40]: 💰
          - generic [ref=e41]: Fee Treasury & Dues
        - button "📊 Academic Performance" [ref=e42] [cursor=pointer]:
          - generic [ref=e43]: 📊
          - generic [ref=e44]: Academic Performance
        - button "📅 School Calendar" [ref=e45] [cursor=pointer]:
          - generic [ref=e46]: 📅
          - generic [ref=e47]: School Calendar
        - button "💬 Staff Messages" [ref=e48] [cursor=pointer]:
          - generic [ref=e49]: 💬
          - generic [ref=e50]: Staff Messages
      - generic [ref=e51]:
        - generic [ref=e52]:
          - paragraph [ref=e53]: Institutional Administrator
          - generic [ref=e54]:
            - generic [ref=e55]: trustee
            - generic [ref=e56]: HOD-01
        - button "🚪 Sign Out" [ref=e57] [cursor=pointer]:
          - generic [ref=e58]: 🚪
          - generic [ref=e59]: Sign Out
    - main [ref=e60]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]:
            - paragraph [ref=e65]: Executive Suite
            - heading "HOD / Trustee & Principal Command Center 🏛️" [level=1] [ref=e66]
            - paragraph [ref=e67]: Unified institutional audit, financial growth, and academic student management
          - generic [ref=e68]:
            - button "🔗 Copy Direct Member Portal Link (/portal)" [ref=e69] [cursor=pointer]:
              - generic [ref=e70]: 🔗
              - generic [ref=e71]: Copy Direct Member Portal Link (/portal)
            - button "🩺 System & Isolation Check" [ref=e72] [cursor=pointer]:
              - generic [ref=e73]: 🩺
              - generic [ref=e74]: System & Isolation Check
            - button "📥 Bulk CSV Onboarding" [ref=e75] [cursor=pointer]:
              - generic [ref=e76]: 📥
              - generic [ref=e77]: Bulk CSV Onboarding
            - generic [ref=e78]:
              - button "Trustee Analytics" [ref=e79] [cursor=pointer]
              - button "Directory & Credentials" [ref=e80] [cursor=pointer]
              - button "📢 Circulars (0)" [ref=e81] [cursor=pointer]
              - button "🎨 Brand & Certificate Studio" [ref=e82] [cursor=pointer]:
                - generic [ref=e83]: 🎨
                - generic [ref=e84]: Brand & Certificate Studio
              - button "🧹 Non-Teaching Staff" [ref=e85] [cursor=pointer]:
                - generic [ref=e86]: 🧹
                - generic [ref=e87]: Non-Teaching Staff
              - button "🏦 School UPI QR & Fee Setup" [ref=e88] [cursor=pointer]:
                - generic [ref=e89]: 🏦
                - generic [ref=e90]: School UPI QR & Fee Setup
        - generic [ref=e92]:
          - generic [ref=e93]:
            - generic [ref=e94]:
              - generic [ref=e95]: 📚
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - heading "Today's Campus Pulse" [level=3] [ref=e100]
                  - generic [ref=e101]: LIVE
                - paragraph [ref=e102]: 12 Nov 2026
            - generic [ref=e103]: Campus Open (Working Day)
          - generic [ref=e106]:
            - heading "Regular Academic Day 📚" [level=4] [ref=e107]
            - paragraph [ref=e108]: All regular class lectures, lab sessions, and academic timetable in full effect.
          - generic [ref=e109]:
            - generic [ref=e110]:
              - generic [ref=e111]: 7-Day Campus Radar
              - generic [ref=e112]: 0 special dates ahead
            - paragraph [ref=e114]: ✨ No special holidays or exams in the next 7 days. Regular academic schedule active.
        - generic [ref=e115]:
          - generic [ref=e116]:
            - generic [ref=e117]:
              - generic [ref=e118]:
                - generic [ref=e119]:
                  - generic [ref=e120]: Principal's AI Briefing
                  - generic [ref=e125]: Term 2026-2027 (as of Nov 12, 2026)
                  - generic [ref=e129]: 25 Deterministic Prompts • Zero Hallucination
                - heading "Institutional Intelligence Briefing & Telemetry" [level=2] [ref=e134]
                - paragraph [ref=e135]: Verified institutional synthesis compiled directly from student registers, fee ledgers, and academic marks.
              - button "Refresh Briefing" [ref=e137] [cursor=pointer]
            - generic [ref=e144]:
              - generic [ref=e145]:
                - generic [ref=e146]: Enrolled Scholars
                - text: "2"
              - generic [ref=e147]:
                - generic [ref=e148]: Faculty Roster
                - text: "1"
              - generic [ref=e149]:
                - generic [ref=e150]: Campus Attendance
                - text: 0%
              - generic [ref=e151]:
                - generic [ref=e152]: Fee Collection Rate
                - text: 0%
              - generic [ref=e153]:
                - generic [ref=e154]: Outstanding Arrears
                - text: ₹0
              - generic [ref=e155]:
                - generic [ref=e156]: Radar Watchlist
                - text: "0"
            - generic [ref=e157]:
              - heading "1. Institutional Overview" [level=3] [ref=e163]
              - paragraph [ref=e164]: Institutional campus OASIS-TUTORIALS is operating with 2 enrolled scholars and 1 faculty members (PTR 2.0:1). Total fee billing stands at ₹0 with ₹0 collected (0% velocity). Attendance register population is ongoing.
            - generic [ref=e165]:
              - heading "2. Important Observations & Trends" [level=3] [ref=e170]
              - generic [ref=e171]:
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - generic [ref=e174]:
                      - generic [ref=e175]: Treasury
                      - generic [ref=e176]: Stable
                    - heading "Fee Structure Initialization" [level=4] [ref=e177]
                    - paragraph [ref=e178]: No fee invoices have been posted for the active academic term yet.
                  - generic [ref=e179]: "📊 Billed: ₹0.00 • Inflow: ₹0.00"
                - generic [ref=e181]:
                  - generic [ref=e182]:
                    - generic [ref=e183]:
                      - generic [ref=e184]: Attendance
                      - generic [ref=e185]: Stable
                    - heading "Daily Attendance Baseline" [level=4] [ref=e186]
                    - paragraph [ref=e187]: Attendance registers have not yet been submitted for the current reporting cycle.
                  - generic [ref=e188]: "📊 Status: Awaiting First Register Entry"
                - generic [ref=e190]:
                  - generic [ref=e191]:
                    - generic [ref=e192]:
                      - generic [ref=e193]: Academic
                      - generic [ref=e194]: Optimal
                    - heading "Academic Risk Radar Clear" [level=4] [ref=e195]
                    - paragraph [ref=e196]: No scholars are currently flagged for critical attendance dips or sub-40% test marks.
                  - generic [ref=e197]: "📊 At-Risk Count: 0 Scholars"
            - generic [ref=e199]:
              - heading "3. Recommended Management Actions" [level=3] [ref=e204]
              - generic [ref=e205]:
                - generic [ref=e206]:
                  - generic [ref=e207]:
                    - text: Treasury
                    - heading "Verify Term Fee Receipts" [level=4] [ref=e208]
                    - paragraph [ref=e209]: Review recently reconciled payments and print statutory receipt copies.
                  - button "Open Treasury" [ref=e210] [cursor=pointer]
                - generic [ref=e214]:
                  - generic [ref=e215]:
                    - text: Operations
                    - heading "Check Academic Calendar & Working Days" [level=4] [ref=e216]
                    - paragraph [ref=e217]: Confirm upcoming holidays, examination windows, and timetable schedules.
                  - button "View Calendar" [ref=e218] [cursor=pointer]
                - generic [ref=e222]:
                  - generic [ref=e223]:
                    - text: Communication
                    - heading "Publish Parent Announcement" [level=4] [ref=e224]
                    - paragraph [ref=e225]: Broadcast an official school notice or newsletter to parents and staff.
                  - button "Send Notice" [ref=e226] [cursor=pointer]
            - generic [ref=e230]:
              - generic [ref=e231]:
                - generic [ref=e232]:
                  - heading "4. Executive Intelligence Prompt Catalog (25 Core Analytical Prompts)" [level=3] [ref=e236]
                  - paragraph [ref=e237]: Select any pre-configured question to compute real-time analytical answers from verified school registers.
                - textbox "Search 25 prompts..." [ref=e242]
              - generic [ref=e243]:
                - button "All Prompts (25)" [ref=e244] [cursor=pointer]
                - button "Fees & Treasury (5)" [ref=e245] [cursor=pointer]
                - button "Attendance (5)" [ref=e246] [cursor=pointer]
                - button "Academics (5)" [ref=e247] [cursor=pointer]
                - button "Exams & Results (3)" [ref=e248] [cursor=pointer]
                - button "Daily Operations (4)" [ref=e249] [cursor=pointer]
                - button "Staff & Faculty (3)" [ref=e250] [cursor=pointer]
              - generic [ref=e251]:
                - button "Fees & Treasury What is the total fee collection rate and outstanding balance this term? Evaluates collection velocity, total billed invoices, and active overdue debt. Run Live Analysis" [ref=e252] [cursor=pointer]:
                  - generic [ref=e253]:
                    - generic [ref=e254]: Fees & Treasury
                    - heading "What is the total fee collection rate and outstanding balance this term?" [level=4] [ref=e255]
                    - paragraph [ref=e256]: Evaluates collection velocity, total billed invoices, and active overdue debt.
                  - generic [ref=e257]: Run Live Analysis
                - button "Fees & Treasury Which classes or batches have the highest pending fee arrears? Ranks classes by total outstanding student fee balances. Run Live Analysis" [ref=e261] [cursor=pointer]:
                  - generic [ref=e262]:
                    - generic [ref=e263]: Fees & Treasury
                    - heading "Which classes or batches have the highest pending fee arrears?" [level=4] [ref=e264]
                    - paragraph [ref=e265]: Ranks classes by total outstanding student fee balances.
                  - generic [ref=e266]: Run Live Analysis
                - button "Fees & Treasury List students with overdue fee balances exceeding ₹25,000. Pinpoints high-exposure student default cases requiring executive intervention. Run Live Analysis" [ref=e270] [cursor=pointer]:
                  - generic [ref=e271]:
                    - generic [ref=e272]: Fees & Treasury
                    - heading "List students with overdue fee balances exceeding ₹25,000." [level=4] [ref=e273]
                    - paragraph [ref=e274]: Pinpoints high-exposure student default cases requiring executive intervention.
                  - generic [ref=e275]: Run Live Analysis
                - button "Fees & Treasury What is the fee reconciliation velocity across payment modes? Analyzes paid receipts by collection instrument (UPI, Bank Transfer, Cash). Run Live Analysis" [ref=e279] [cursor=pointer]:
                  - generic [ref=e280]:
                    - generic [ref=e281]: Fees & Treasury
                    - heading "What is the fee reconciliation velocity across payment modes?" [level=4] [ref=e282]
                    - paragraph [ref=e283]: Analyzes paid receipts by collection instrument (UPI, Bank Transfer, Cash).
                  - generic [ref=e284]: Run Live Analysis
                - button "Fees & Treasury How many fee receipts have been issued vs unpaid student dues? Compares cleared invoice count with outstanding student ledgers. Run Live Analysis" [ref=e288] [cursor=pointer]:
                  - generic [ref=e289]:
                    - generic [ref=e290]: Fees & Treasury
                    - heading "How many fee receipts have been issued vs unpaid student dues?" [level=4] [ref=e291]
                    - paragraph [ref=e292]: Compares cleared invoice count with outstanding student ledgers.
                  - generic [ref=e293]: Run Live Analysis
                - button "Attendance & Absenteeism What is the overall student campus attendance percentage this term? Computes institutional daily attendance rate across all grade levels. Run Live Analysis" [ref=e297] [cursor=pointer]:
                  - generic [ref=e298]:
                    - generic [ref=e299]: Attendance & Absenteeism
                    - heading "What is the overall student campus attendance percentage this term?" [level=4] [ref=e300]
                    - paragraph [ref=e301]: Computes institutional daily attendance rate across all grade levels.
                  - generic [ref=e302]: Run Live Analysis
                - button "Attendance & Absenteeism Which class or section has the lowest attendance rate and needs attention? Flags the batch experiencing the highest chronic absenteeism. Run Live Analysis" [ref=e306] [cursor=pointer]:
                  - generic [ref=e307]:
                    - generic [ref=e308]: Attendance & Absenteeism
                    - heading "Which class or section has the lowest attendance rate and needs attention?" [level=4] [ref=e309]
                    - paragraph [ref=e310]: Flags the batch experiencing the highest chronic absenteeism.
                  - generic [ref=e311]: Run Live Analysis
                - button "Attendance & Absenteeism Which students are chronically absent (attendance below 75%)? Identifies students below statutory 75% attendance threshold. Run Live Analysis" [ref=e315] [cursor=pointer]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: Attendance & Absenteeism
                    - heading "Which students are chronically absent (attendance below 75%)?" [level=4] [ref=e318]
                    - paragraph [ref=e319]: Identifies students below statutory 75% attendance threshold.
                  - generic [ref=e320]: Run Live Analysis
                - button "Attendance & Absenteeism What is the attendance distribution across all active grade levels? Summarizes attendance rates class-by-class across the campus. Run Live Analysis" [ref=e324] [cursor=pointer]:
                  - generic [ref=e325]:
                    - generic [ref=e326]: Attendance & Absenteeism
                    - heading "What is the attendance distribution across all active grade levels?" [level=4] [ref=e327]
                    - paragraph [ref=e328]: Summarizes attendance rates class-by-class across the campus.
                  - generic [ref=e329]: Run Live Analysis
                - button "Attendance & Absenteeism Are there any class attendance registers missing or unsubmitted today? Audits today's teacher attendance submissions against registered classes. Run Live Analysis" [ref=e333] [cursor=pointer]:
                  - generic [ref=e334]:
                    - generic [ref=e335]: Attendance & Absenteeism
                    - heading "Are there any class attendance registers missing or unsubmitted today?" [level=4] [ref=e336]
                    - paragraph [ref=e337]: Audits today's teacher attendance submissions against registered classes.
                  - generic [ref=e338]: Run Live Analysis
                - button "Academic Performance What is the institutional pass percentage across recent class tests? Calculates pass percentage (>= 40%) across all published test scores. Run Live Analysis" [ref=e342] [cursor=pointer]:
                  - generic [ref=e343]:
                    - generic [ref=e344]: Academic Performance
                    - heading "What is the institutional pass percentage across recent class tests?" [level=4] [ref=e345]
                    - paragraph [ref=e346]: Calculates pass percentage (>= 40%) across all published test scores.
                  - generic [ref=e347]: Run Live Analysis
                - button "Academic Performance Which subject has the lowest average score in the latest assessments? Identifies subject curriculums requiring academic coaching or teacher support. Run Live Analysis" [ref=e351] [cursor=pointer]:
                  - generic [ref=e352]:
                    - generic [ref=e353]: Academic Performance
                    - heading "Which subject has the lowest average score in the latest assessments?" [level=4] [ref=e354]
                    - paragraph [ref=e355]: Identifies subject curriculums requiring academic coaching or teacher support.
                  - generic [ref=e356]: Run Live Analysis
                - button "Academic Performance Which class is performing highest academically across all subjects? Computes overall grade point average across batches to recognize top classes. Run Live Analysis" [ref=e360] [cursor=pointer]:
                  - generic [ref=e361]:
                    - generic [ref=e362]: Academic Performance
                    - heading "Which class is performing highest academically across all subjects?" [level=4] [ref=e363]
                    - paragraph [ref=e364]: Computes overall grade point average across batches to recognize top classes.
                  - generic [ref=e365]: Run Live Analysis
                - button "Academic Performance List scholars flagged on the academic risk radar (scores < 40%). Identifies students failing tests for targeted remedial assistance. Run Live Analysis" [ref=e369] [cursor=pointer]:
                  - generic [ref=e370]:
                    - generic [ref=e371]: Academic Performance
                    - heading "List scholars flagged on the academic risk radar (scores < 40%)." [level=4] [ref=e372]
                    - paragraph [ref=e373]: Identifies students failing tests for targeted remedial assistance.
                  - generic [ref=e374]: Run Live Analysis
                - button "Academic Performance How many tests have been completed vs scheduled tests pending marks entry? Audits syllabus assessment completion and teacher score entry backlog. Run Live Analysis" [ref=e378] [cursor=pointer]:
                  - generic [ref=e379]:
                    - generic [ref=e380]: Academic Performance
                    - heading "How many tests have been completed vs scheduled tests pending marks entry?" [level=4] [ref=e381]
                    - paragraph [ref=e382]: Audits syllabus assessment completion and teacher score entry backlog.
                  - generic [ref=e383]: Run Live Analysis
                - button "Exams & Results What is the overall exam performance distribution across grade levels? Breaks marks down into Distinction (>=75%), 1st Class, 2nd Class, and Remedial. Run Live Analysis" [ref=e387] [cursor=pointer]:
                  - generic [ref=e388]:
                    - generic [ref=e389]: Exams & Results
                    - heading "What is the overall exam performance distribution across grade levels?" [level=4] [ref=e390]
                    - paragraph [ref=e391]: Breaks marks down into Distinction (>=75%), 1st Class, 2nd Class, and Remedial.
                  - generic [ref=e392]: Run Live Analysis
                - button "Exams & Results Are all examination marks entered and published for the current term? Audits draft vs published examination records across academic departments. Run Live Analysis" [ref=e396] [cursor=pointer]:
                  - generic [ref=e397]:
                    - generic [ref=e398]: Exams & Results
                    - heading "Are all examination marks entered and published for the current term?" [level=4] [ref=e399]
                    - paragraph [ref=e400]: Audits draft vs published examination records across academic departments.
                  - generic [ref=e401]: Run Live Analysis
                - button "Exams & Results Identify top academic performers across the institution for honors. Ranks top achieving scholars (>= 85% average) for merit certificates. Run Live Analysis" [ref=e405] [cursor=pointer]:
                  - generic [ref=e406]:
                    - generic [ref=e407]: Exams & Results
                    - heading "Identify top academic performers across the institution for honors." [level=4] [ref=e408]
                    - paragraph [ref=e409]: Ranks top achieving scholars (>= 85% average) for merit certificates.
                  - generic [ref=e410]: Run Live Analysis
                - button "Daily Operations Are all class attendance registers submitted and up to date for today? Monitors daily operational roll-call submission across faculty homerooms. Run Live Analysis" [ref=e414] [cursor=pointer]:
                  - generic [ref=e415]:
                    - generic [ref=e416]: Daily Operations
                    - heading "Are all class attendance registers submitted and up to date for today?" [level=4] [ref=e417]
                    - paragraph [ref=e418]: Monitors daily operational roll-call submission across faculty homerooms.
                  - generic [ref=e419]: Run Live Analysis
                - button "Daily Operations Are there pending class test scores waiting for teacher submission? Detects tests conducted in the past 14 days without submitted scores. Run Live Analysis" [ref=e423] [cursor=pointer]:
                  - generic [ref=e424]:
                    - generic [ref=e425]: Daily Operations
                    - heading "Are there pending class test scores waiting for teacher submission?" [level=4] [ref=e426]
                    - paragraph [ref=e427]: Detects tests conducted in the past 14 days without submitted scores.
                  - generic [ref=e428]: Run Live Analysis
                - button "Daily Operations What upcoming institutional events or exams are scheduled on the calendar? Extracts events, PTMs, exams, and holidays in the upcoming 14 days. Run Live Analysis" [ref=e432] [cursor=pointer]:
                  - generic [ref=e433]:
                    - generic [ref=e434]: Daily Operations
                    - heading "What upcoming institutional events or exams are scheduled on the calendar?" [level=4] [ref=e435]
                    - paragraph [ref=e436]: Extracts events, PTMs, exams, and holidays in the upcoming 14 days.
                  - generic [ref=e437]: Run Live Analysis
                - button "Daily Operations How many active parent/student broadcast notices were sent this month? Audits campus communications, alerts, and circulars dispatched. Run Live Analysis" [ref=e441] [cursor=pointer]:
                  - generic [ref=e442]:
                    - generic [ref=e443]: Daily Operations
                    - heading "How many active parent/student broadcast notices were sent this month?" [level=4] [ref=e444]
                    - paragraph [ref=e445]: Audits campus communications, alerts, and circulars dispatched.
                  - generic [ref=e446]: Run Live Analysis
                - button "Staff & Faculty What is the current Pupil-to-Teacher Ratio (PTR) and is it compliant? Compares current campus teacher allocation against statutory 30:1 standard. Run Live Analysis" [ref=e450] [cursor=pointer]:
                  - generic [ref=e451]:
                    - generic [ref=e452]: Staff & Faculty
                    - heading "What is the current Pupil-to-Teacher Ratio (PTR) and is it compliant?" [level=4] [ref=e453]
                    - paragraph [ref=e454]: Compares current campus teacher allocation against statutory 30:1 standard.
                  - generic [ref=e455]: Run Live Analysis
                - button "Staff & Faculty What is the faculty headcount and subject distribution across departments? Maps teaching faculty counts across core curriculum subjects. Run Live Analysis" [ref=e459] [cursor=pointer]:
                  - generic [ref=e460]:
                    - generic [ref=e461]: Staff & Faculty
                    - heading "What is the faculty headcount and subject distribution across departments?" [level=4] [ref=e462]
                    - paragraph [ref=e463]: Maps teaching faculty counts across core curriculum subjects.
                  - generic [ref=e464]: Run Live Analysis
                - button "Staff & Faculty Are there any unassigned classes or subjects missing teacher coverage? Checks curriculum coverage to ensure every section has an assigned teacher. Run Live Analysis" [ref=e468] [cursor=pointer]:
                  - generic [ref=e469]:
                    - generic [ref=e470]: Staff & Faculty
                    - heading "Are there any unassigned classes or subjects missing teacher coverage?" [level=4] [ref=e471]
                    - paragraph [ref=e472]: Checks curriculum coverage to ensure every section has an assigned teacher.
                  - generic [ref=e473]: Run Live Analysis
            - generic [ref=e477]:
              - generic [ref=e478]: "Analysis Engine: Deterministic Rules & Telemetry Engine (Zero-Hallucination Safe)"
              - generic [ref=e479]: Confidential • Authorized Campus Executive Eyes Only
          - generic [ref=e480]:
            - generic [ref=e481]:
              - generic [ref=e492]:
                - generic [ref=e493]:
                  - generic [ref=e494]: AI Early Warning Radar
                  - generic [ref=e495]: Live Scan
                - heading "Active Student Intervention Cases" [level=3] [ref=e496]
                - paragraph [ref=e497]: Scholars flagged for Attendance < 75% AND Test Evaluations < 40%
              - generic [ref=e498]: 0 Scholars Require Action
            - generic [ref=e502]:
              - button "All Cases (0)" [ref=e503] [cursor=pointer]
              - button "Critical Priority (<70%)" [ref=e504] [cursor=pointer]
              - button "Attendance Deficit (<75%)" [ref=e505] [cursor=pointer]
              - button "Academic Risk (<40%)" [ref=e506] [cursor=pointer]
            - generic [ref=e508]:
              - generic [ref=e509]: ✓
              - heading "Radar Clear — No At-Risk Scholars Flagged" [level=4] [ref=e510]
              - paragraph [ref=e511]: All enrolled scholars are currently performing above the 75% attendance and 40% academic threshold.
          - generic [ref=e512]:
            - generic [ref=e513]:
              - generic [ref=e514]:
                - generic [ref=e515]:
                  - paragraph [ref=e520]: Reconciled Revenue
                  - generic [ref=e521]: Trustee Treasury
                - generic [ref=e522]:
                  - paragraph [ref=e523]: ₹0.00
                  - generic [ref=e524]: Clean Ledger • Awaiting Settlements
              - generic [ref=e525]: 0 recorded transactions
            - generic [ref=e526]:
              - generic [ref=e527]:
                - paragraph [ref=e532]: Active Students
                - paragraph [ref=e533]: "2"
              - generic [ref=e534]: Verified scholar directory node
            - generic [ref=e535]:
              - generic [ref=e536]:
                - paragraph [ref=e537]: Faculty Strength
                - paragraph [ref=e538]: 1 Tutors
              - generic [ref=e539]: Institutional academic faculty
            - generic [ref=e540]:
              - generic [ref=e541]:
                - paragraph [ref=e542]: Fee Collection Recovery Rate
                - paragraph [ref=e543]: 0%
                - generic [ref=e544]: Live calculated across tuition billing cycles
              - generic [ref=e545]:
                - generic [ref=e546]:
                  - generic [ref=e547]: Status
                  - text: Reconciled
                - generic [ref=e548]:
                  - generic [ref=e549]: Gateway
                  - text: Instant UPI
          - generic [ref=e550]:
            - generic [ref=e551]:
              - generic [ref=e553]:
                - generic [ref=e554]:
                  - generic [ref=e555]: 📅
                  - text: Attendance Pacing
                - heading "Campus Attendance Trend" [level=3] [ref=e556]
                - paragraph [ref=e557]: Daily attendance % across working days
              - generic [ref=e558]:
                - generic [ref=e559]: 📅
                - paragraph [ref=e560]: No Attendance Recorded
                - paragraph [ref=e561]: Attendance register records will plot trend lines here.
            - generic [ref=e562]:
              - generic [ref=e564]:
                - generic [ref=e565]:
                  - generic [ref=e566]: 💰
                  - text: Treasury Dues
                - heading "Fee Recovery Overview" [level=3] [ref=e567]
                - paragraph [ref=e568]: Collected revenue vs outstanding arrears
              - generic [ref=e569]:
                - generic [ref=e570]: 💰
                - paragraph [ref=e571]: Clean Treasury Ledger
                - paragraph [ref=e572]: No transactions recorded for this billing cycle.
            - generic [ref=e573]:
              - generic [ref=e575]:
                - generic [ref=e576]:
                  - generic [ref=e577]: 🎓
                  - text: Strength
                - heading "Class-Wise Distribution" [level=3] [ref=e578]
                - paragraph [ref=e579]: Enrolled scholar strength by class
              - application [ref=e583]:
                - generic [ref=e596]:
                  - generic [ref=e597]: Class 10-ICSE
                  - generic [ref=e600]:
                    - generic [ref=e601]: "0"
                    - generic [ref=e603]: "1"
                    - generic [ref=e605]: "2"
                    - generic [ref=e607]: "3"
                    - generic [ref=e609]: "4"
          - generic [ref=e611]:
            - heading "Board & Financial Compliance Vault" [level=2] [ref=e612]
            - paragraph [ref=e613]: All institutional tax records, rental agreements, and teacher contracts are encrypted and verified under Supabase RLS security standards.
            - generic [ref=e614]:
              - button "Download Certified Financial Audit (PDF) 📥" [ref=e615] [cursor=pointer]
              - button "📥 + Bulk Import Students / Faculty (.CSV)" [ref=e616] [cursor=pointer]:
                - generic [ref=e617]: 📥
                - generic [ref=e618]: + Bulk Import Students / Faculty (.CSV)
    - generic [ref=e619]:
      - button "📲 Install App" [ref=e620] [cursor=pointer]:
        - generic [ref=e621]: 📲
        - generic [ref=e622]: Install App
      - button "✕" [ref=e624] [cursor=pointer]
  - generic [aria-hidden] [ref=e625]: "0"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | /**
  4   |  * End-to-End Test Suite: Core Institutional Lifecycle Loop
  5   |  * 1. Log in as HOD/Trustee
  6   |  * 2. Enroll a student via Supabase on Trustee Dashboard
  7   |  * 3. Log out & Log in as Faculty Teacher
  8   |  * 4. Mark daily attendance on Teacher Attendance Register
  9   |  * 5. Log out & Log in as Enrolled Student
  10  |  * 6. Verify real-time metrics and synchronization on Student Dashboard
  11  |  */
  12  | 
  13  | test.describe("Tuition ERP - Multi-Tenant Institutional E2E Lifecycle", () => {
  14  |   test.beforeEach(async ({ page }) => {
  15  |     await page.goto("/login");
  16  |   });
  17  | 
  18  |   test("Step 1 to 6: Core Institutional Loop (HOD -> Teacher -> Student)", async ({ page }) => {
  19  |     // ------------------------------------------------------------------------
  20  |     // STEP 1: LOGIN AS HOD / TRUSTEE
  21  |     // ------------------------------------------------------------------------
  22  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  23  |     await page.fill('[data-testid="input-personal-code"]', "HOD-01");
  24  |     await page.fill('[data-testid="input-password"]', "password123");
  25  |     await page.click('[data-testid="btn-login-submit"]');
  26  | 
  27  |     // Confirm navigation to Trustee Command Center
  28  |     await expect(page).toHaveURL(/\/trustee\/dashboard/, { timeout: 15000 });
  29  |     await expect(page.locator("h1")).toContainText(/Command Center/i);
  30  | 
  31  |     // ------------------------------------------------------------------------
  32  |     // STEP 2: ENROLL STUDENT VIA TRUSTEE DASHBOARD
  33  |     // ------------------------------------------------------------------------
  34  |     const academicsTab = page.locator('button:has-text("Principal Student & Class Control")');
> 35  |     await academicsTab.click();
      |                        ^ Error: locator.click: Test timeout of 45000ms exceeded.
  36  | 
  37  |     const studentNameInput = page.locator('input[placeholder="Student Full Name"]');
  38  |     await expect(studentNameInput).toBeVisible({ timeout: 10000 });
  39  | 
  40  |     const testStudentName = `E2E Student ${Date.now().toString().slice(-4)}`;
  41  |     await studentNameInput.fill(testStudentName);
  42  | 
  43  |     const submitStudentBtn = page.locator('button:has-text("Enroll New Student")');
  44  |     await submitStudentBtn.click();
  45  |     await page.waitForTimeout(1000);
  46  | 
  47  |     // ------------------------------------------------------------------------
  48  |     // STEP 3: LOGOUT VIA SIDEBAR
  49  |     // ------------------------------------------------------------------------
  50  |     const signOutBtn = page.locator('button:has-text("Sign Out")');
  51  |     await signOutBtn.click();
  52  |     await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  53  | 
  54  |     // ------------------------------------------------------------------------
  55  |     // STEP 4: LOGIN AS FACULTY TEACHER
  56  |     // ------------------------------------------------------------------------
  57  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  58  |     await page.fill('[data-testid="input-personal-code"]', "TCH-01");
  59  |     await page.fill('[data-testid="input-password"]', "password123");
  60  |     await page.click('[data-testid="btn-login-submit"]');
  61  | 
  62  |     await expect(page).toHaveURL(/\/teacher\/dashboard/, { timeout: 15000 });
  63  |     await expect(page.locator("h1")).toContainText(/Welcome back/i);
  64  | 
  65  |     // ------------------------------------------------------------------------
  66  |     // STEP 5: MARK DAILY ATTENDANCE ON TEACHER REGISTER
  67  |     // ------------------------------------------------------------------------
  68  |     await page.goto("/teacher/attendance");
  69  |     await expect(page.locator("h1")).toContainText(/Attendance Register/i);
  70  | 
  71  |     // Ensure a batch is chosen if available
  72  |     const selectDropdown = page.locator("select");
  73  |     await selectDropdown.waitFor({ state: "visible", timeout: 10000 });
  74  |     const options = await selectDropdown.locator("option").all();
  75  |     if (options.length > 1) {
  76  |       const val = await options[1].getAttribute("value");
  77  |       if (val) await selectDropdown.selectOption(val);
  78  |     }
  79  | 
  80  |     await page.waitForTimeout(1000);
  81  | 
  82  |     const markAllPresentBtn = page.locator('button:has-text("Mark All Present")');
  83  |     if (await markAllPresentBtn.isVisible()) {
  84  |       await markAllPresentBtn.click();
  85  |     }
  86  | 
  87  |     const saveAttendanceBtn = page.locator('button:has-text("Save Attendance Register")');
  88  |     if (await saveAttendanceBtn.isVisible()) {
  89  |       await saveAttendanceBtn.click();
  90  |       await page.waitForTimeout(1000);
  91  |     }
  92  | 
  93  |     // ------------------------------------------------------------------------
  94  |     // STEP 6: LOGOUT AND LOGIN AS STUDENT
  95  |     // ------------------------------------------------------------------------
  96  |     await page.locator('button:has-text("Sign Out")').click();
  97  |     await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  98  | 
  99  |     await page.fill('[data-testid="input-institution-code"]', "OASIS-TUTORIALS");
  100 |     await page.fill('[data-testid="input-personal-code"]', "STU-1024");
  101 |     await page.fill('[data-testid="input-password"]', "password123");
  102 |     await page.click('[data-testid="btn-login-submit"]');
  103 | 
  104 |     await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  105 |     await expect(page.locator("h1")).toContainText(/Welcome Back/i);
  106 | 
  107 |     await expect(page.locator("text=Live Attendance")).toBeVisible();
  108 |     await expect(page.locator("text=Homework Tasks")).toBeVisible();
  109 |   });
  110 | 
  111 |   test("Multi-Tenant Subdomain & White-Label Resolution", async ({ page }) => {
  112 |     await page.goto("/login?tenant=OASIS-TUTORIALS");
  113 |     const institutionInput = page.locator('[data-testid="input-institution-code"]');
  114 |     await expect(institutionInput).toBeVisible();
  115 |     await expect(institutionInput).toHaveValue("OASIS-TUTORIALS");
  116 |     await expect(page).toHaveTitle(/Tuition ERP/i);
  117 |   });
  118 | 
  119 |   test("Dynamic PDF Invoices & Transcript Vault", async ({ page }) => {
  120 |     // 1-Click login as student
  121 |     const studentBtn = page.locator('button:has-text("Student")');
  122 |     await studentBtn.click();
  123 |     await page.click('[data-testid="btn-login-submit"]');
  124 | 
  125 |     await expect(page).toHaveURL(/\/student\/dashboard/, { timeout: 15000 });
  126 | 
  127 |     // Navigate to Fees & Transcripts
  128 |     await page.goto("/student/fees");
  129 |     await expect(page.locator("h1")).toContainText(/Student Fee Vault & Transcripts/i);
  130 | 
  131 |     // Verify PDF actions exist
  132 |     const downloadTranscriptBtn = page.locator('button:has-text("Download PDF Transcript")').first();
  133 |     await expect(downloadTranscriptBtn).toBeVisible();
  134 | 
  135 |     const downloadInvoiceBtn = page.locator('button:has-text("Download Invoice")').first();
```