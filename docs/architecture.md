# Architecture

The system has two largely-independent flows that meet at the `customrecord_acp_vonb_request` record:

- **UI flow** — what a user sees when opening a Vendor record (driven by the UE script)
- **Request lifecycle** — what happens to an onboarding request from creation through approval (driven by SuiteFlow, Workato, and the WorkflowAction script)

Splitting them keeps each diagram tractable.

## UI flow — Vendor record banner & button

When a user opens a Vendor record, the User Event script decides what banner and button to show based on the vendor's verification state and any existing onboarding request.

```mermaid
flowchart TD
    Start([User opens Vendor record]) --> V{Vendor verified?}
    V -- Yes --> NoUI([No banner, no button])
    V -- No --> Q[Look up the latest<br/>onboarding request<br/>for this vendor]
    Q --> Has{Request exists?}
    Has -- No --> NoReq[Banner: 'Not started'<br/>+ Submit button<br/>→ click opens new<br/>request creation page]
    Has -- Yes --> Status{Status?}
    Status -- Rejected --> RejBanner[Banner: 'Rejected'<br/>+ View button<br/>→ click opens the<br/>latest request]
    Status -- Approved --> ApprovedDone[View button]
    Status -- Other --> InProg[Banner: 'In progress'<br/>+ View button]
```

## Request lifecycle — from creation to approval

Once submitted, the request flows through a state machine. State transitions are driven by three actors: the user (button clicks), Workato (field writes), and the WorkflowAction script (cross-record updates on Approved entry). The diagram below is **time-decoupled** — the Workato block runs on a daily schedule, not synchronously after submission.

```mermaid
flowchart TD
    Create([User creates request]) --> Draft[State: Draft]
    Draft -->|User clicks<br/>Submit for Compliance| PCC[State: Pending<br/>Compliance Check]
    
    PCC -.->|async — Workato polls<br/>once a day| Workato[Workato recipe:<br/>SEC EDGAR API call]
    Workato --> WResult{Compliance check}
    WResult -- Yes --> WPass[Workato writes:<br/>compliance_result=Pass,<br/>Status=PMA]
    WResult -- No --> WMR[Workato writes:<br/>compliance_result=Manual Review,<br/>Status=PCC]
    
    WPass --> PMA[State: Pending<br/>Manager Approval]
    WMR --> StuckPCC[Stays in PCC —<br/>manual KYV needed]
    
    PMA -->|Manager clicks<br/>Approve| Approved[State: Approved]
    PMA -->|Manager clicks<br/>Reject| Rejected[State: Rejected]
    
    Approved --> Side[Entry actions:<br/>set approver, approval_date,<br/>audit_log + WorkflowAction script]
    Side --> Vendor[Vendor record updated:<br/>verified=T, verified_date=now]
```

Dashed arrow = asynchronous (Workato polling, not a sequential user action).

## State machine

```mermaid
stateDiagram-v2
    state "Pending Compliance Check" as PCC
    state "Pending Manager Approval" as PMA
    [*] --> Draft : User creates request
    Draft --> PCC : Submit for Compliance button (WF)
    PCC --> PMA : Workato writes new status
    PMA --> Approved : Approve button 
    PMA --> Rejected : Reject button 
    Approved --> [*]
    Rejected --> [*]
```

For Manual Review case, the request stays in Pending Compliance Check with `compliance_result = Manual Review` — Workato's filter condition `Status = PCC AND compliance_result IS NULL` prevents re-processing.

## SuiteFlow workflow internals

### States and actions

| State                    | Buttons added         | Entry actions         |
| ------------------------ | --------------------- | --------------------- |
| Draft                    | Submit for Compliance | —                     |
| Pending Compliance Check | —                     | Set Status = PCC      |
| Pending Manager Approval | Approve, Reject       | —                     |
| Approved (terminal)      | —                     | 5 actions, see below  |
| Rejected (terminal)      | —                     | Set Status = Rejected |

### Approved entry actions — order of execution

1. Set Field Value: `Status = Approved`
2. Set Field Value: `approver = {user}` 
3. Set Field Value: `approval_date = TODAY`
4. **Custom action:** invoke WorkflowAction script `customscript_acpvendoronboardingwf` — propagates verification to Vendor record
5. Set Field Value: `audit_log` 

### Transitions

| From  | To       | Trigger                                   | Condition                               |
| ----- | -------- | ----------------------------------------- | --------------------------------------- |
| Draft | PCC      | Execute on Button = Submit for Compliance | —                                       |
| PCC   | PMA      | After Record Submit                       | Status field = Pending Manager Approval |
| PMA   | Approved | Execute on Button = Approve               | —                                       |
| PMA   | Rejected | Execute on Button = Reject                | —                                       |
|       |          |                                           |                                         |

## Workato recipe

<img src="screenshots/workato-recipe.jpg" alt="Workato recipe — full flow" width="500">

