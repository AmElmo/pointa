# Probe Design Checklist

Use this before running a Prototype Probe.

## Probe quality
- Is the uncertainty material enough to justify a probe?
- Is the probe tied to one concrete question?
- Is the probe smaller than full implementation?
- Can the result change the spec approval decision?

## Scope control
- What is explicitly in scope?
- What is explicitly out of scope?
- Which surfaces may be touched?
- What would make this probe too broad?

## Evidence
- What outcome would justify approval?
- What outcome would require revision?
- What outcome would suggest another narrow probe?
- What footguns or side effects must be recorded even if the probe succeeds?

## Safety
- Is there any risk of probe code being treated like production-ready output?
- Is there a clean way to prevent direct merge from probe artifacts?
- Are follow-up tasks likely to be needed after the probe?
