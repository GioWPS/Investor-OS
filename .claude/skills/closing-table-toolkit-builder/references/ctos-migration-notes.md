# Writing Logic That Survives Into Closing Table OS

## The core idea

Closing Table OS's Deal Analyzer module and Funding Path Finder module are the real, fuller versions
of two of this app's three tools. If the toolkit's logic is written well, it gets *lifted* into CTOS
when that build starts — not rewritten. If it's written poorly (tangled into page components, mixed
with UI state, coupled to this app's specific database calls), it gets thrown away and rebuilt from
scratch, which means this entire project produced marketing value but zero engineering leverage
toward the product Henry actually wants to end up with.

The test for "is this portable": **could you copy this one file into a completely different
codebase, with a different UI framework and a different database, and have it still work with zero
changes?** If yes, it's portable. If it imports React, calls Supabase directly, or reads from
`request` objects, it isn't.

## Concretely, what this means

**Don't do this** (logic tangled into a page/component):

```tsx
// app/tools/max-offer/page.tsx
export default function MaxOfferPage() {
  const [arv, setArv] = useState(0);
  const [repairs, setRepairs] = useState(0);
  const handleSubmit = async () => {
    const mao = arv * 0.7 - repairs; // the actual Henry framework logic, buried here
    await supabase.from('tool_results').insert({ ... });
    // ...
  };
}
```

**Do this instead** (logic as a pure module, page just wires it up):

```ts
// lib/tools/max-offer.ts
export interface MaxOfferInputs {
  arv: number;
  repairCost: number;
  // whatever else Henry's actual MAO framework needs — offer margin %, wholesale fee, etc.
}

export interface MaxOfferResult {
  maxOffer: number;
  verdict: 'good' | 'tight' | 'pass';
  // ...
}

export function calculateMaxOffer(inputs: MaxOfferInputs): MaxOfferResult {
  // Henry's actual MAO formula lives here, and only here.
  // No React, no Supabase, no Next.js imports — just math and business logic.
}
```

```tsx
// app/tools/max-offer/page.tsx
import { calculateMaxOffer } from '@/lib/tools/max-offer';

// The page's job is just: collect inputs, call calculateMaxOffer, save the result, render it,
// fire the GHL webhook. All the actual domain logic is already tested and portable in lib/tools/.
```

Apply the same pattern to the Funding Path Finder's decision tree (a pure function from a user's
answers to a matched funding path) and the First Deal Blueprint's generation logic (a pure function
from a user's tool history to a generated plan).

## Why this specific pattern, and not something fancier

Don't over-engineer this into a plugin architecture or a generic "rules engine" — that's solving a
problem CTOS doesn't have yet, and it would slow Gio down for no real benefit at this stage. A plain
`lib/tools/<tool-name>.ts` file per tool, exporting typed input/output interfaces and a pure
calculation function, is enough. It's the decoupling that matters, not the sophistication.

## What "lifted into CTOS" will actually look like later

When Closing Table OS's Deal Analyzer module gets built, the expectation is that `calculateMaxOffer`
(or its equivalent, likely expanded with more of Henry's framework) gets imported more or less as-is
into the new codebase, possibly extended with more inputs and AI Deal Coach context, rather than
reimplemented from a spec. That's the payoff for keeping it pure now.
